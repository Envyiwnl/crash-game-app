const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  round: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Round'
  },
  usdAmount: {
    type: Number,
    required: true
  },
  cryptoAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['bet', 'cashout'],
    required: true
  },
  transactionHash: {
    type: String,
    required: true
  },
  priceAtTime: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
    timestamps:true
});

module.exports = mongoose.model('Transaction', transactionSchema);