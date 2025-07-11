const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: String,
  email: String,
  title: String, // facultatif, peut être utilisé pour résumé global
  swissLink: String,
  status: { type: String, default: "en attente" },
  date: { type: Date, default: Date.now },
  messages: [],
  items: [ // ✅ liste claire des vidéos commandées
    {
      name: String,
      quantity: Number,
      options: [String],
      price: Number
    }
  ]
});

module.exports = mongoose.model("Order", orderSchema);
