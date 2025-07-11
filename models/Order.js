const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["admin", "client"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  options: { type: [String], default: [] },
  price: { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  email: { type: String, required: true },
  title: { type: String, default: "Commande sans titre" },
  swissLink: { type: String, default: "Lien non fourni" },
  status: { type: String, default: "en attente" },
  date: { type: Date, default: Date.now },
  messages: { type: [messageSchema], default: [] },
  items: { type: [itemSchema], default: [] }
});

module.exports = mongoose.model("Order", orderSchema);
