const Joi = require('joi');
const Order = require('../models/order');
const Product = require('../models/product');
const mongoose = require('mongoose');

exports.listOrders = async (req,res) => {
  const { page=1, limit=10, status } = req.query;
  const skip = (parseInt(page)-1)*parseInt(limit);
  const filter = {};
  if(status) filter.status = status;
  const items = await Order.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt:-1 });
  const total = await Order.countDocuments(filter);
  res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
};

const statusSchema = Joi.object({
  status: Joi.string().valid('SHIPPED','DELIVERED','CANCELLED').required()
});

exports.updateStatus = async (req, res) => {
  const { id } = req.params;

  const { error, value } = statusSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.status === "CANCELLED") {
    return res.status(400).json({ message: "Order already cancelled" });
  }

  if (value.status === "CANCELLED") {
    for (const it of order.items) {
      await Product.findByIdAndUpdate(
        it.productId,
        {
          $inc: {
            reservedStock: -it.quantity,
            availableStock: it.quantity,
          }
        },
        { new: true }
      );
    }
  }

  order.status = value.status;
  await order.save();

  res.json({
    message: "Order status updated",
    order
  });
};

