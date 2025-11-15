const Joi = require('joi');
const Cart = require('../models/cart');
const Product = require('../models/product');

const addSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required()
});

exports.get = async (req,res) => {
  const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
  if(!cart) return res.json({ items: [] });
  res.json(cart);
};

exports.addOrUpdate = async (req,res) => {
  const { error, value } = addSchema.validate(req.body);
  if(error) return res.status(400).json({ message: error.message });
  const product = await Product.findById(value.productId);
  if(!product) return res.status(404).json({ message: 'Product not found' });
  let cart = await Cart.findOne({ userId: req.user._id });
  if(!cart) {
    cart = new Cart({ userId: req.user._id, items: [{ productId: value.productId, quantity: value.quantity }] });
  } else {
    const idx = cart.items.findIndex(i => i.productId.toString() === value.productId);
    if(idx === -1) cart.items.push({ productId: value.productId, quantity: value.quantity });
    else cart.items[idx].quantity = value.quantity;
  }
  await cart.save();
  res.json(cart);
};

exports.removeItem = async (req,res) => {
  const { productId } = req.params;
  const cart = await Cart.findOne({ userId: req.user._id });
  if(!cart) return res.status(404).json({ message: 'Cart not found' });
  cart.items = cart.items.filter(i => i.productId.toString() !== productId);
  await cart.save();
  res.json(cart);
};
