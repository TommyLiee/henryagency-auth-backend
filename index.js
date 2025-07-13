const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const Order = require("./models/Order");
const User = require("./models/User");

const app = express();
const PORT = 3000;
const JWT_SECRET = "henrysupersecret2025";
const ADMIN_EMAIL = "tr33fle@gmail.com";

// 📁 Fichiers statiques (ex: /notif.mp3)
app.use(express.static(path.join(__dirname, "public")));

// 🧩 Middlewares
app.use(cors());
app.use(express.json());

// 🔌 Connexion MongoDB
mongoose.connect("mongodb+srv://admin:admin123@henryagency.nrvabdb.mongodb.net/?retryWrites=true&w=majority")
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => console.error("❌ Erreur MongoDB :", err));

// 🔐 Middleware JWT
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

// 👤 Inscription
app.post("/register", async (req, res) => {
  const { firstName, lastName, phone, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email déjà utilisé" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      phone,
      email,
      password: hashedPassword
    });
    await user.save();
    res.json({ message: "✅ Compte créé avec succès" });
  } catch (err) {
    console.error("❌ Erreur inscription :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// 🔑 Connexion
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Utilisateur non trouvé" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Mot de passe incorrect" });

    const token = jwt.sign({
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token });
  } catch (err) {
    console.error("❌ Erreur connexion :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// 🧑‍💼 Profil utilisateur
app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// 📦 Commandes - côté client
app.get("/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ email: req.user.email }).sort({ date: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ➕ Création de commande
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
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// 👨‍💼 Commandes - côté admin
app.get("/admin-orders", authMiddleware, async (req, res) => {
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  try {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// 💬 Récupérer les messages
app.get("/orders/:id/messages", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    const isOwner = order.email === req.user.email;
    const isAdmin = req.user.email === ADMIN_EMAIL;
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Non autorisé" });

    res.json(order.messages || []);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// 📤 Envoyer un message
app.post("/orders/:id/messages", authMiddleware, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: "Message vide" });

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    const isOwner = order.email === req.user.email;
    const isAdmin = req.user.email === ADMIN_EMAIL;
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Non autorisé" });

    const newMessage = {
      sender: isAdmin ? "admin" : "client",
      text,
      timestamp: new Date()
    };

    order.messages.push(newMessage);
    await order.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// 🚀 Démarrage
app.listen(PORT, () => {
  console.log(`🚀 Serveur backend lancé sur le port ${PORT}`);
});
