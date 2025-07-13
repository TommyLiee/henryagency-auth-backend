const mongoose = require("mongoose");

// Sous-schema : message (chat entre client et admin)
const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["admin", "client"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

// Sous-schema : item de commande
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  options: { type: [String], default: [] },
  price: { type: Number, required: true }
}, { _id: false });

// Schéma principal : commande
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true }, // Utile pour affichage rapide si besoin
  title: { type: String, default: "Commande sans titre" },
  swissLink: { type: String, default: "Lien non fourni" },
  status: { type: String, default: "en attente" },
  date: { type: Date, default: Date.now },
  messages: { type: [messageSchema], default: [] },
  items: { type: [itemSchema], default: [] }
});

module.exports = mongoose.model("Order", orderSchema);
