const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Order = require('./models/Order');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

// Connexion MongoDB
mongoose.connect("mongodb+srv://admin:admin123@henryagency.nrvabdb.mongodb.net/?retryWrites=true&w=majority&appName=HenryAgency")
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => console.error("❌ Erreur MongoDB :", err));

// Middleware JWT
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token manquant" });

  try {
    const decoded = jwt.verify(token, "a9X7!eZr7Lk#92s!zWb@03YTt-456fgr");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: "Token invalide" });
  }
}

// Inscription
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

// Connexion
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Utilisateur non trouvé" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Mot de passe incorrect" });

    const token = jwt.sign({ userId: user._id, email: user.email }, "a9X7!eZr7Lk#92s!zWb@03YTt-456fgr", {
      expiresIn: "7d"
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer les commandes du user
app.get("/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ email: req.user.email }).sort({ date: -1 });
    res.json(orders);
  } catch (err) {
    console.error("❌ Erreur récupération commandes :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Créer une commande
app.post("/create-order", authMiddleware, async (req, res) => {
  const { title, swissLink } = req.body;
  try {
    const order = new Order({
      userId: req.user.userId,
      email: req.user.email,
      title,
      swissLink,
      status: 'en attente',
      messages: []
    });
    await order.save();
    res.json({ message: "✅ Commande créée avec succès" });
  } catch (err) {
    res.status(500).json({ error: "Erreur création commande" });
  }
});

app.listen(4242, () => console.log("🚀 Serveur auth lancé sur le port 4242"));
