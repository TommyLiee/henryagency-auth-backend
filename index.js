const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const Order = require('./models/Order');
const User = require('./models/User');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = "tr33fle@gmail.com";

app.use(cors());
app.use(express.json());

// ✅ Connexion MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => console.error("❌ Erreur MongoDB :", err));

// ✅ Middleware Auth
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token manquant" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: "Token invalide" });
  }
}

// ✅ Inscription
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed });
    await user.save();
    res.json({ message: "✅ Utilisateur créé avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création" });
  }
});

// ✅ Connexion
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Utilisateur non trouvé" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Mot de passe incorrect" });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ✅ Profil utilisateur
app.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: `Bienvenue, utilisateur ${req.user.userId}`,
    email: req.user.email
  });
});

// ✅ Commandes (client)
app.get("/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ email: req.user.email }).sort({ date: -1 });
    res.json(orders);
  } catch (err) {
    console.error("❌ Erreur récupération commandes :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ✅ Création de commande
app.post("/create-order", authMiddleware, async (req, res) => {
  const { title, swissLink, items, date } = req.body;
  try {
    const order = new Order({
      userId: req.user.userId,
      email: req.user.email,
      title: title || "Commande sans titre",
      swissLink,
      items: items || [],
      status: "en attente",
      messages: [],
      date: date || new Date()
    });
    await order.save();
    res.json({ message: "✅ Commande créée avec succès" });
  } catch (err) {
    console.error("❌ Erreur création commande :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ✅ Commandes admin
app.get("/admin-orders", authMiddleware, async (req, res) => {
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  try {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
  } catch (err) {
    console.error("❌ Erreur récupération admin :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ✅ 🔁 Récupérer messages d'une commande
app.get("/orders/:id/messages", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    const isOwner = order.email === req.user.email;
    const isAdmin = req.user.email === ADMIN_EMAIL;
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Non autorisé" });

    res.json(order.messages || []);
  } catch (err) {
    console.error("❌ Erreur récupération messages :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ✅ ✏️ Envoyer un message lié à une commande
app.post("/orders/:id/messages", authMiddleware, async (req, res) => {
  const { text } = req.body;
  if (!text) {
    console.warn("⚠️ Message vide reçu, ignoré.");
    return res.status(400).json({ message: "Message vide" });
  }

  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      console.error("❌ Commande introuvable pour l'envoi de message.");
      return res.status(404).json({ message: "Commande non trouvée" });
    }

    const isOwner = order.email === req.user.email;
    const isAdmin = req.user.email === ADMIN_EMAIL;
    if (!isOwner && !isAdmin) {
      console.warn("⚠️ Utilisateur non autorisé à écrire un message.");
      return res.status(403).json({ message: "Non autorisé" });
    }

    const sender = isAdmin ? "admin" : "client";
    console.log("➡️ Nouveau message reçu :", { sender, text });

    order.messages.push({
      sender,
      text,
      timestamp: new Date()
    });

    await order.save();

    console.log("✅ Message sauvegardé dans la commande :", order._id);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Erreur lors de l'enregistrement du message :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ✅ Lancement serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur backend lancé sur le port ${PORT}`);
});
