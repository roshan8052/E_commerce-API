const Joi = require('joi');
const Product = require('../models/product');

const productSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow(''),
  price: Joi.number().required(),
  availableStock: Joi.number().integer().min(0).required()
});

exports.create = async (req,res) => {
  const { error, value } = productSchema.validate(req.body);
  if(error) return res.status(400).json({ message: error.message });
  const p = new Product(value);
  await p.save();
  res.status(201).json(p);
};

exports.update = async (req,res) => {
  const { id } = req.params;
  const { error, value } = productSchema.validate(req.body);
  if(error) return res.status(400).json({ message: error.message });
  const p = await Product.findByIdAndUpdate(id, value, { new: true });
  if(!p) return res.status(404).json({ message: 'Product not found' });
  res.json(p);
};

exports.remove = async (req,res) => {
  const { id } = req.params;
  const p = await Product.findByIdAndDelete(id);
  if(!p) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Deleted' });
};

exports.list = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "name",
    order = "asc",
    q,
    minPrice,
    maxPrice
  } = req.query;

  const filter = {};

  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } }
    ];
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const sort = {};
  sort[sortBy] = order === "desc" ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const items = await Product.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Product.countDocuments(filter);

  res.json({
    items,
    total,
    page: parseInt(page),
    limit: parseInt(limit)
  });
};

