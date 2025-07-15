// ✅ index.js sans erreurs de syntaxe

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const Order = require("./models/Order");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = "henrysupersecret2025";
const ADMIN_EMAIL = "tr33fle@gmail.com";
const GOOGLE_CLIENT_ID = "638043072445-l20os9t7k32baur7qgdg7s8r7ptpud82.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());
app.use(session({ secret: "keyboard cat", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin:admin123@henryagency.nrvabdb.mongodb.net/?retryWrites=true&w=majority")
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => console.error("❌ Erreur MongoDB :", err));

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token manquant" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ message: "Token invalide" });
  }
}

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "https://henryagency-auth-backend.onrender.com/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      email,
      password: "",
      provider: "google"
    });
    await user.save();
  }
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback", passport.authenticate("google", {
  session: false,
  failureRedirect: "/login"
}), (req, res) => {
  const user = req.user;
  const token = jwt.sign({
    userId: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName
  }, JWT_SECRET, { expiresIn: "7d" });

  res.redirect(`https://tests-1c0c5e-d0ae5cc8df195a1a1628634fd5.webflow.io/dashboard?token=${token}`);
});

app.post("/inscription", async (req, res) => {
  const { firstName, lastName, phone, email, password } = req.body;
  try {
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) return res.status(400).json({ error: "Email déjà utilisé" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      phone: phone?.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      provider: "local"
    });
    await newUser.save();
    res.json({ message: "✅ Compte créé avec succès" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
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
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    res.json(user);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

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
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId }).sort({ date: -1 });

    const updatedOrders = orders.map(order => {
      const lastRead = order.lastReadByClient ? new Date(order.lastReadByClient) : new Date(0);

      // Filtrer tous les messages de l'admin non lus
      const unreadMessages = order.messages?.filter(msg =>
        msg.sender === "admin" && new Date(msg.timestamp) > lastRead
      ) || [];

      return {
        ...order.toObject(),
        hasNewMessage: unreadMessages.length > 0,
        newMessageCount: unreadMessages.length
      };
    });

    res.json(updatedOrders);
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// ✅ Changement de statut (admin)
app.patch("/admin-orders/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body;
  const allowedStatus = ["en attente", "payée", "en cours", "en pause", "terminée"];

  if (req.user.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Accès refusé" });
  if (!allowedStatus.includes(status)) return res.status(400).json({ message: "Statut invalide" });

  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    res.json({ message: `✅ Statut mis à jour vers "${status}"`, order });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ✅ Changement de progression (admin)
app.patch("/admin-orders/:id/progress", authMiddleware, async (req, res) => {
  const { progression } = req.body;

  if (req.user.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Accès refusé" });

  if (![0, 25, 50, 75, 100].includes(progression)) {
    return res.status(400).json({ message: "Progression invalide" });
  }

  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { progression }, { new: true });
    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    res.json({ message: `✅ Progression mise à jour : ${progression}%`, order });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});


// ✅ Liste des commandes pour admin
app.get("/admin-orders", authMiddleware, async (req, res) => {
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  try {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
});


app.get("/orders/:id/messages", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    const isOwner = order.userId.toString() === req.user.userId;
    const isAdmin = req.user.email === ADMIN_EMAIL;
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Non autorisé" });

    res.json(order.messages || []);
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/orders/:id/messages", authMiddleware, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: "Message vide" });

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    const isOwner = order.userId.toString() === req.user.userId;
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
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
});
app.patch("/orders/:id/mark-read", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    const isOwner = order.userId.toString() === req.user.userId;
    if (!isOwner) return res.status(403).json({ message: "Non autorisé" });

    order.lastReadByClient = new Date();
    await order.save();

    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend lancé sur http://localhost:${PORT}`);
});
