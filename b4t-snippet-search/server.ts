import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./src/db/index.js";
import { app_users, b4t_clients, b4t_matters, b4t_timeentries, b4t_invoices, b4t_expenses } from "./src/db/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-replace-me";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Authentication Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admins only" });
  }
  next();
};

// Seed admin user if none exists
async function seedAdmin() {
  try {
    const users = await db.select().from(app_users).limit(1);
    if (users.length === 0) {
      console.log("No users found. Seeding default admin user...");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.insert(app_users).values({
        email: "admin@example.com",
        passwordHash: hashedPassword,
        role: "admin",
      });
      console.log("Default admin created: admin@example.com / admin123");
    }
  } catch (err) {
    console.error("Failed to seed admin:", err);
  }
}

// Auth Routes
app.post("/api/auth/login", async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

  try {
    const userResult = await db.select().from(app_users).where(eq(app_users.email, email)).limit(1);
    const user = userResult[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "1d" });
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    res.json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/logout", (req: any, res: any) => {
  res.clearCookie("token");
  res.json({ success: true });
});

app.get("/api/auth/me", authenticate, (req: any, res: any) => {
  res.json(req.user);
});

// Admin User Management Routes
app.get("/api/admin/users", authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    const users = await db.select({ id: app_users.id, email: app_users.email, role: app_users.role, createdAt: app_users.createdAt }).from(app_users);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/admin/users", authenticate, requireAdmin, async (req: any, res: any) => {
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing required fields" });

  try {
    const existing = await db.select().from(app_users).where(eq(app_users.email, email)).limit(1);
    if (existing.length > 0) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insert(app_users).values({ email, passwordHash: hashedPassword, role: role || "user" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Data Routes (B4T Export Data)
app.get("/api/data/dashboard", authenticate, async (req: any, res: any) => {
  try {
    const [{ count: clientCount }] = await db.select({ count: sql<number>`count(*)` }).from(b4t_clients);
    const [{ count: projectCount }] = await db.select({ count: sql<number>`count(*)` }).from(b4t_matters);
    const [{ count: invoiceCount }] = await db.select({ count: sql<number>`count(*)` }).from(b4t_invoices);
    const [{ count: timeEntryCount }] = await db.select({ count: sql<number>`count(*)` }).from(b4t_timeentries);
    
    res.json({
      clients: clientCount,
      projects: projectCount,
      invoices: invoiceCount,
      timeEntries: timeEntryCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/data/clients", authenticate, async (req: any, res: any) => {
  try {
    const clients = await db.select().from(b4t_clients).limit(100); // Limit for now
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/data/projects", authenticate, async (req: any, res: any) => {
  try {
    const projects = await db.select().from(b4t_matters).limit(100);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

import { SNIPPET_SEARCH_QUERY } from "./src/db/report_query.js";

app.get("/api/data/report", authenticate, async (req: any, res: any) => {
  try {
    const result = await db.execute(sql.raw(SNIPPET_SEARCH_QUERY));
    res.json(result.rows);
  } catch (err) {
    console.error("Report generation error:", err);
    res.status(500).json({ error: "Server error", details: err instanceof Error ? err.message : String(err) });
  }
});

async function startServer() {
  await seedAdmin();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
