const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String }
});

// ✅ Évite l'erreur "OverwriteModelError"
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
