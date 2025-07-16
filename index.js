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
const Deliverable = require("./models/Deliverable");

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = "henrysupersecret2025";
const ADMIN_EMAIL = "tr33fle@gmail.com";
const GOOGLE_CLIENT_ID = "638043072445-l20os9t7k32baur7qgdg7s8r7ptpud82.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

app.use(express.static(path.join(__dirname, "public")));
app.use(cors({
  origin: "https://tests-1c0c5e-d0ae5cc8df195a1a1628634fd5.webflow.io",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],    // ← autorise l’en-tête Authorization
  methods: ["GET","POST","PATCH","PUT","DELETE","OPTIONS"]
}));


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
    const orders = await Order.find({ userId: req.user.userId }).sort({ date: -1 }).lean();
    const orderIds = orders.map(o => o._id);
    const allDeliveries = await Deliverable.find({ orderId: { $in: orderIds } }).sort({ deliveredAt: -1 });

    const updatedOrders = orders.map(order => {
      const deliveries = allDeliveries.filter(d => d.orderId.toString() === order._id.toString());

      const lastRead = order.lastReadByClient ? new Date(order.lastReadByClient) : new Date(0);
      const unreadMessages = order.messages?.filter(msg =>
        msg.sender === "admin" && new Date(msg.timestamp) > lastRead
      ) || [];

      return {
        ...order,
        deliveries,
        hasNewMessage: unreadMessages.length > 0,
        newMessageCount: unreadMessages.length
      };
    });

    res.json(updatedOrders);
  } catch (err) {
    console.error(err);
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

// ✅ Nouvelle route pour livrer une vidéo (enregistre dans order.deliveries)
app.post("/admin-orders/:id/deliveries", authMiddleware, async (req, res) => {
  if (req.user.email !== ADMIN_EMAIL) return res.status(403).json({ message: "Accès refusé" });

  const { url, title } = req.body;
  if (!url) return res.status(400).json({ message: "URL manquante" });

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Commande non trouvée" });

    const newDeliverable = new Deliverable({
      orderId: order._id,
      title: title || "Vidéo livrée",
      url,
      published: false,
      feedbacks: [],
      deliveredAt: new Date()
    });

    await newDeliverable.save();

    res.json({ message: "✅ Vidéo livrée avec succès", deliverable: newDeliverable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/deliverables/:id/feedback/:feedbackId/reply", authMiddleware, async (req, res) => {
  const { text } = req.body;
  const { id, feedbackId } = req.params;

  if (!text) return res.status(400).json({ message: "Texte manquant" });

  try {
    const deliverable = await Deliverable.findById(id);
    if (!deliverable) return res.status(404).json({ message: "Livrable introuvable" });

    const order = await Order.findById(deliverable.orderId);
    if (!order) return res.status(404).json({ message: "Commande introuvable" });

    const isOwner = order.userId.toString() === req.user.userId;
    const isAdmin = req.user.email === ADMIN_EMAIL;
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Non autorisé" });

    const feedback = deliverable.feedbacks.id(feedbackId);
    if (!feedback) return res.status(404).json({ message: "Commentaire introuvable" });

    feedback.replies.push({
      author: isAdmin ? "admin" : "client",
      text,
      createdAt: new Date()
    });

    await deliverable.save();

    res.json({ message: "✅ Réponse ajoutée", replies: feedback.replies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


app.get("/deliverables/:orderId", async (req, res) => {
  try {
    const deliverables = await Deliverable.find({ orderId: req.params.orderId });
    res.json(deliverables);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/deliverable/:id", authMiddleware, async (req, res) => {
  try {
    const d = await Deliverable.findById(req.params.id);
    if (!d) return res.status(404).json({ message: "Deliverable non trouvé" });
    res.json(d);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


app.post("/deliverables/:id/feedback", authMiddleware, async (req, res) => {
  const { text, timestamp, drawing } = req.body;

  if (!text || typeof timestamp !== "number") {
    return res.status(400).json({ message: "Texte ou timestamp manquant/invalide" });
  }

  try {
    const deliverable = await Deliverable.findById(req.params.id);
    if (!deliverable) return res.status(404).json({ message: "Livrable introuvable" });

    const order = await Order.findById(deliverable.orderId);
    if (!order) return res.status(404).json({ message: "Commande introuvable" });

    const isOwner = order.userId.toString() === req.user.userId;
    const isAdmin = req.user.email === ADMIN_EMAIL;
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Non autorisé" });

    deliverable.feedbacks.push({
      author: isAdmin ? "admin" : "client",
      timestamp,
      text,
      drawing: Array.isArray(drawing) ? drawing : [],
      createdAt: new Date()
    });

    await deliverable.save();
    res.json({ message: "✅ Commentaire avec dessin ajouté", feedbacks: deliverable.feedbacks });
  } catch (err) {
    console.error(err);
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
