const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const feedbackSchema = new mongoose.Schema({
  author: { type: String, enum: ["admin", "client"], required: true },
  timestamp: { type: Number, required: true }, // en secondes
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  replies: { type: [replySchema], default: [] } // ⬅ sous-commentaires ici
});

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
