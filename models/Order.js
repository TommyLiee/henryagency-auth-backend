const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: String,
  email: String,
  title: String, // facultatif
  swissLink: String,
  status: { type: String, default: "en attente" },
  date: { type: Date, default: Date.now },
  messages: [],
  items: [ // ✅ NOUVEAU
    {
      name: String,
      quantity: Number,
      options: [String],
      price: Number
    }
  ]
});

module.exports = mongoose.model("Order", orderSchema);
