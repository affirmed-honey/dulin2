const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5173;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_DEFAULT_MS = 24 * 60 * 60 * 1000; // 1 day

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

// Helper to create JWT and set cookie
function setAuthCookie(res, payload, opts = {}) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: Math.floor((opts.expiresMs || JWT_EXPIRES_DEFAULT_MS) / 1000) });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS/proxy
    maxAge: opts.expiresMs || JWT_EXPIRES_DEFAULT_MS,
    path: "/",
  };
  res.cookie("token", token, cookieOptions);
}

// Middleware to parse user from cookie if present
function authMiddleware(req, _res, next) {
  const token = req.cookies?.token;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (_e) {
    // invalid token; clear user
    req.user = undefined;
  }
  next();
}
app.use(authMiddleware);

// API routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// List products with basic filtering and sorting
app.get("/api/products", async (req, res) => {
  try {
    const { q, category, sort } = req.query;

    // Build DB-side filters that are safe for SQLite (no `mode`)
    const where = {};
    if (category) where.category = { equals: String(category) };

    let orderBy = undefined;
    if (sort === "price-asc") orderBy = { price: "asc" };
    if (sort === "price-desc") orderBy = { price: "desc" };
    if (sort === "name") orderBy = { name: "asc" };

    let products = await prisma.product.findMany({ where, orderBy });

    // In-memory case-insensitive filtering for q (SQLite lacks `mode: 'insensitive'`)
    if (q) {
      const qStr = String(q).toLowerCase();
      products = products.filter((p) => {
        return [p.name, p.category, p.description]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(qStr));
      });
    }

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load products" });
  }
});

// Auth: signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    const emailNorm = String(email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) return res.status(400).json({ error: "Invalid email" });
    if (String(password).length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({ data: { email: emailNorm, name: name || null, passwordHash } });

    setAuthCookie(res, { id: user.id, email: user.email, name: user.name });
    return res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sign up" });
  }
});

// Auth: login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, remember } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    const emailNorm = String(email).toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const expires = remember ? 7 * 24 * 60 * 60 * 1000 : JWT_EXPIRES_DEFAULT_MS; // 7 days vs 1 day
    setAuthCookie(res, { id: user.id, email: user.email, name: user.name }, { expiresMs: expires });
    return res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to login" });
  }
});

// Auth: current user
app.get("/api/auth/me", async (req, res) => {
  try {
    if (!req.user?.id) return res.status(200).json(null);
    const user = await prisma.user.findUnique({ where: { id: Number(req.user.id) } });
    if (!user) return res.status(200).json(null);
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load user" });
  }
});

// Auth: logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", { path: "/" });
  res.status(204).end();
});

// Require-auth middleware for protected routes
function requireAuth(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Update profile (name only)
app.put("/api/auth/profile", requireAuth, async (req, res) => {
  try {
    const { name } = req.body || {};
    const id = Number(req.user.id);
    if (name != null && String(name).trim().length === 0) {
      return res.status(400).json({ error: "Name cannot be empty" });
    }
    const updated = await prisma.user.update({ where: { id }, data: { name: name ?? undefined } });
    // Refresh cookie payload with new name
    setAuthCookie(res, { id: updated.id, email: updated.email, name: updated.name });
    res.json({ id: updated.id, email: updated.email, name: updated.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Change password
app.post("/api/auth/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both current and new password are required" });
    if (String(newPassword).length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
    const id = Number(req.user.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

// Change email (re-auth required)
app.post("/api/auth/change-email", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newEmail } = req.body || {};
    if (!currentPassword || !newEmail) return res.status(400).json({ error: "Both current password and new email are required" });
    const emailNorm = String(newEmail).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) return res.status(400).json({ error: "Invalid email" });
    const id = Number(req.user.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
    // Check uniqueness
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing && existing.id !== id) return res.status(409).json({ error: "Email already in use" });
    const updated = await prisma.user.update({ where: { id }, data: { email: emailNorm } });
    // Refresh cookie with new email
    setAuthCookie(res, { id: updated.id, email: updated.email, name: updated.name });
    res.json({ id: updated.id, email: updated.email, name: updated.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to change email" });
  }
});

// My orders for current user
app.get("/api/orders/mine", requireAuth, async (req, res) => {
  try {
    const id = Number(req.user.id);
    const orders = await prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// Product details
app.get("/api/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: "Not found" });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load product" });
  }
});

// Create an order (mock checkout)
app.post("/api/orders", async (req, res) => {
  try {
    const { name, email, items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items are required" });
    }

    // Expect items as [{ productId, quantity }]
    const productIds = items.map((it) => Number(it.productId)).filter((n) => !Number.isNaN(n));
    if (productIds.length !== items.length) {
      return res.status(400).json({ error: "Invalid product ids" });
    }

    const dbProducts = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (dbProducts.length !== productIds.length) {
      return res.status(400).json({ error: "Some products not found" });
    }

    // Build order items with priceAtPurchase (kobo)
    const itemsDetailed = items.map((it) => {
      const p = dbProducts.find((dp) => dp.id === Number(it.productId));
      const qty = Math.max(1, Number(it.quantity) || 1);
      return {
        productId: p.id,
        name: p.name,
        image: p.image,
        priceAtPurchase: p.price, // already in kobo
        quantity: qty,
      };
    });

    const subtotalKobo = itemsDetailed.reduce((sum, it) => sum + it.priceAtPurchase * it.quantity, 0);
    const shippingKobo = subtotalKobo > 50000 * 100 ? 0 : 1500 * 100; // free over ₦50,000
    const taxKobo = Math.round(subtotalKobo * 0.075);
    const totalKobo = subtotalKobo + shippingKobo + taxKobo;

    // Create/find user if email is provided (optional)
    let userId = undefined;
    if (email) {
      const user = await prisma.user.upsert({
        where: { email },
        update: { name: name || undefined },
        create: { email, name: name || null, passwordHash: "", },
      });
      userId = user.id;
    }

    const order = await prisma.order.create({
      data: {
        userId,
        items: itemsDetailed,
        subtotal: subtotalKobo,
        shipping: shippingKobo,
        tax: taxKobo,
        total: totalKobo,
        status: "pending",
      },
    });

    return res.status(201).json({
      id: order.id,
      subtotal: Math.round(subtotalKobo / 100),
      shipping: Math.round(shippingKobo / 100),
      tax: Math.round(taxKobo / 100),
      total: Math.round(totalKobo / 100),
      status: order.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Get order by id (for confirmation page, optional)
app.get("/api/orders/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Not found" });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load order" });
  }
});

// Serve static frontend
const staticDir = path.join(__dirname, "..");
app.use(express.static(staticDir));

// Fallback to index.html if needed (optional for SPA-like routing)
// app.get("*", (_req, res) => res.sendFile(path.join(staticDir, "index.html")));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
