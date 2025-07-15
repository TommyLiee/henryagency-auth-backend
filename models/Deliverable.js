// models/Deliverable.js

const mongoose = require("mongoose");

const deliverableSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },
  title: {
    type: String,
    default: "Livrable"
  },
  url: {
    type: String,
    required: true
  },
  feedbacks: [
    {
      timestamp: Number, // seconde de la vidéo
      comment: String
    }
  ],
  published: {
    type: Boolean,
    default: false // ✅ par défaut, non visible par le client
  },
  deliveredAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Deliverable", deliverableSchema);
