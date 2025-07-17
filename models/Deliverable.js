const mongoose = require("mongoose");

// Sous-schema pour les réponses à un commentaire
const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Schéma principal pour un commentaire avec dessin
const feedbackSchema = new mongoose.Schema({
  author: { type: String, enum: ["admin", "client"], required: true },
  timestamp: { type: Number, required: true }, // secondes
  text: { type: String, required: true },
  drawing: {
    type: [[Number]],
    default: []
  },
  shapes: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  replies: { type: [replySchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});


// Schéma global du livrable
const deliverableSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },
  title: {
    type: String,
    default: "Vidéo livrée"
  },
  url: {
    type: String,
    required: true
  },
  feedbacks: {
    type: [feedbackSchema],
    default: []
  },
  deliveredAt: {
    type: Date,
    default: Date.now
  },
  published: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("Deliverable", deliverableSchema);
