const Joi = require('joi');
const mongoose = require('mongoose');
const Cart = require('../models/cart');
const Product = require('../models/product');
const Order = require('../models/order');
const Payment = require('../models/payment');
const { enqueue } = require('../utils/jobQueue');

const checkoutSchema = Joi.object({});

async function reserveStockFallback(items) {
  const modified = [];

  try {
    for (const it of items) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: it.productId,
          availableStock: { $gte: it.quantity }
        },
        {
          $inc: { availableStock: -it.quantity, reservedStock: it.quantity }
        },
        { new: true }
      );

      if (!updated) throw new Error("INSUFFICIENT_STOCK");

      modified.push(it);
    }
    return { ok: true, modified };
  } catch (err) {
    for (const m of modified) {
      await Product.findByIdAndUpdate(m.productId, {
        $inc: { availableStock: m.quantity, reservedStock: -m.quantity }
      });
    }
    return { ok: false, error: err };
  }
}

exports.checkout = async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: "Cart empty" });
  }

  const cartItems = cart.items.map(i => ({
    productId: i.productId,
    quantity: i.quantity
  }));

  let order;

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    let total = 0;
    const items = [];

    for (const it of cartItems) {
      const p = await Product.findById(it.productId).session(session);
      if (!p) throw new Error("PRODUCT_NOT_FOUND");
      if (p.availableStock < it.quantity) throw new Error("INSUFFICIENT_STOCK");

      p.availableStock -= it.quantity;
      p.reservedStock += it.quantity;
      await p.save({ session });

      items.push({
        productId: p._id,
        quantity: it.quantity,
        priceAtPurchase: p.price
      });

      total += p.price * it.quantity;
    }

    order = new Order({
      userId: req.user._id,
      items,
      totalAmount: total,
      status: "PENDING_PAYMENT"
    });

    await order.save({ session });

    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    if (
      String(err).includes("Transaction") ||
      String(err).includes("replica set")
    ) {
      if (session) session.endSession();

      const r = await reserveStockFallback(cartItems);

      if (!r.ok) {
        return res.status(400).json({ message: "Could not reserve stock" });
      }

      let total = 0;
      const items = [];

      for (const it of cartItems) {
        const p = await Product.findById(it.productId);
        items.push({
          productId: p._id,
          quantity: it.quantity,
          priceAtPurchase: p.price
        });
        total += p.price * it.quantity;
      }

      order = new Order({
        userId: req.user._id,
        items,
        totalAmount: total,
        status: "PENDING_PAYMENT"
      });

      await order.save();

      cart.items = [];
      await cart.save();
    } else {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  }

  const minutes = parseInt(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES || "15");

  enqueue(async () => {
    const fresh = await Order.findById(order._id);

    if (fresh && fresh.status === "PENDING_PAYMENT") {
      for (const it of fresh.items) {
        await Product.findByIdAndUpdate(it.productId, {
          $inc: { availableStock: it.quantity, reservedStock: -it.quantity }
        });
      }

      fresh.status = "CANCELLED";
      await fresh.save();
    }
  }, minutes * 60 * 1000);

  res.status(201).json(order);
};

exports.pay = async (req, res) => {
  const { id } = req.params;

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const order = await Order.findById(id).session(session);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not your order" });
    if (order.status !== "PENDING_PAYMENT")
      return res.status(400).json({ message: "Order not pending payment" });

    const payment = new Payment({
      orderId: order._id,
      transactionId: "txn_" + Date.now(),
      amount: order.totalAmount,
      status: "SUCCESS"
    });

    await payment.save({ session });

    for (const it of order.items) {
      const p = await Product.findById(it.productId).session(session);
      if (!p) throw new Error("Product missing during payment");
      if (p.reservedStock < it.quantity)
        throw new Error("Reserved stock mismatch");

      p.reservedStock -= it.quantity;
      await p.save({ session });
    }

    order.status = "PAID";
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    enqueue(() => {
      console.log("Sending confirmation email for order", order._id);
    }, 0);

    return res.json({ message: "Payment successful" });
  } catch (err) {
    if (
      String(err).includes("Transaction") ||
      String(err).includes("replica")
    ) {
      if (session) session.endSession();

      const order = await Order.findById(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.userId.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Not your order" });
      if (order.status !== "PENDING_PAYMENT")
        return res.status(400).json({ message: "Order not pending payment" });

      const payment = await Payment.create({
        orderId: order._id,
        transactionId: "txn_" + Date.now(),
        amount: order.totalAmount,
        status: "SUCCESS"
      });

      for (const it of order.items) {
        const p = await Product.findById(it.productId);

        if (!p || p.reservedStock < it.quantity) {
          return res.status(400).json({ message: "Reserved stock mismatch" });
        }

        await Product.findByIdAndUpdate(it.productId, {
          $inc: { reservedStock: -it.quantity }
        });
      }

      order.status = "PAID";
      await order.save();

      enqueue(() => {
        console.log("Sending confirmation email for order", order._id);
      }, 0);

      return res.json({ message: "Payment successful" });
    }

    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
};

exports.list = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const items = await Order.find({ userId: req.user._id })
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Order.countDocuments({ userId: req.user._id });
  res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
};

exports.get = async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id).populate("items.productId");
  if (!order) return res.status(404).json({ message: "Not found" });
  if (order.userId.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Forbidden" });
  res.json(order);
};
