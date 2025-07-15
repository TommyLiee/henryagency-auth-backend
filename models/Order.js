const mongoose = require("mongoose");

/* === 🟦 Sous-schéma : messages du chat === */
const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ["admin", "client"],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

/* === 🟩 Sous-schéma : items commandés === */
const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  options: {
    type: [String],
    default: []
  },
  price: {
    type: Number,
    required: true
  }
}, { _id: false });

/* === 🟨 Sous-schéma : commentaires sur les livrables === */
const deliveryCommentSchema = new mongoose.Schema({
  author: {
    type: String,
    enum: ["client", "admin"],
    required: true
  },
  timestamp: {
    type: Number, // en secondes
    required: true
  },
  text: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

/* === 🟥 Sous-schéma : vidéos livrées === */
const deliverySchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  comments: {
    type: [deliveryCommentSchema],
    default: []
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

/* === 📦 Schéma principal : commande === */
const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  email: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: "Commande sans titre"
  },
  swissLink: {
    type: String,
    default: "Lien non fourni"
  },
  status: {
    type: String,
    enum: ["en attente", "payée", "en cours", "en pause", "terminée"],
    default: "en attente"
  },
  progression: {
    type: Number,
    default: 0 // entre 0 et 100
  },
  date: {
    type: Date,
    default: Date.now
  },
  messages: {
    type: [messageSchema],
    default: []
  },
  items: {
    type: [itemSchema],
    default: []
  },
  deliveries: {
    type: [deliverySchema],
    default: []
  },
  lastReadByClient: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model("Order", orderSchema);
