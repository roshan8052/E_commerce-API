const Joi = require('joi');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

exports.register = async (req,res) => {
  const { error, value } = registerSchema.validate(req.body);
  if(error) return res.status(400).json({ message: error.message });
  const exists = await User.findOne({ email: value.email });
  if(exists) return res.status(400).json({ message: 'Email already in use' });
  const user = new User(value);
  await user.save();
  res.status(201).json({ message: 'User created' });
};

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

exports.login = async (req,res) => {
  const { error, value } = loginSchema.validate(req.body);
  if(error) return res.status(400).json({ message: error.message });
  const user = await User.findOne({ email: value.email });
  if(!user) return res.status(400).json({ message: 'Invalid credentials' });
  const ok = await user.comparePassword(value.password);
  if(!ok) return res.status(400).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
};
