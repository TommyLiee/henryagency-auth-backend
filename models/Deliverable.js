const mongoose = require("mongoose");

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
    type: [
      {
        author: { type: String, enum: ["admin", "client"], required: true },
        timestamp: { type: Number, required: true }, // en secondes
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
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
