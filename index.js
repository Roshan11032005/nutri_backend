import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import otpRoutes from "./routes/otpRoutes.js";
import UserRoutes from "./routes/UserRoutes.js";
import logger from "./config/logger.js";
import fs from "fs";
import path from "path";
import cors from "cors";
import searchfood from "./routes/searchfood.js";
dotenv.config();

const app = express();

// ====== CORS Configuration ======
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());

// ====== Trust proxy (fix X-Forwarded-For warning) ======
app.set("trust proxy", 1); // trust first proxy (needed for rate-limit)

// ====== Check if keys exist ======
const keysDir = path.join(process.cwd(), "keys");
const privateKeyPath = path.join(keysDir, "private.key");
const publicKeyPath = path.join(keysDir, "public.key");

if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
  console.error("❌ RSA keys not found! Run 'node generateKeys.js' first.");
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, "utf8");
const publicKey = fs.readFileSync(publicKeyPath, "utf8");

// ====== Connect to MongoDB ======
connectDB().catch((err) => {
  console.error("❌ Failed to connect to MongoDB:", err.message);
  process.exit(1);
});

// ====== Routes ======
app.use("/api/auth", otpRoutes);
app.use("/api", UserRoutes);
app.use("/api/food", searchfood);

// ====== Health Check ======
app.get("/health", async (req, res) => {
  let dbStatus = "disconnected";
  try {
    const db = await connectDB();
    await db.command({ ping: 1 });
    dbStatus = "connected";
  } catch (err) {
    dbStatus = "disconnected";
  }

  res.json({
    status: "ok",
    message: "Server healthy",
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ====== Global Error Handler ======
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  res.status(500).json({ error: err.message || "Server Error" });
});

// ====== Start Server ======
const PORT = process.env.PORT || 8089;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
