const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  transactionId: String,
  amount: Number,
  status: { type: String, enum: ['SUCCESS','FAILED'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
