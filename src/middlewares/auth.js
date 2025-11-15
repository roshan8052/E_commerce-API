const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.authenticated = async (req,res,next) => {
  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  const token = auth.split(' ')[1];
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if(!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  }catch(err){
    return res.status(401).json({ message: 'Invalid token' });
  }
};

exports.adminOnly = (req,res,next) => {
  if(!req.user || req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden: admin only' });
  next();
};
