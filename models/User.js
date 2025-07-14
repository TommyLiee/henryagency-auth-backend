const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: false }, // ✅ Devient optionnel pour les comptes Google
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String },
  provider: { type: String, default: "local" } // 🧠 Bonus : permet de savoir si c'est un user "google" ou "local"
});

// ✅ Évite l'erreur "OverwriteModelError"
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
