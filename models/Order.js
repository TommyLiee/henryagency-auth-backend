const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: String,
  title: String,
  swissLink: String,
  status: { type: String, default: 'en attente' },
  date: { type: Date, default: Date.now },
  messages: [
    {
      sender: String,
      content: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('Order', orderSchema);
