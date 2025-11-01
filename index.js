import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js"; // Your MongoDB connection function
// Import all necessary routes (assuming they use Mongoose models)
import otpRoutes from "./routes/otpRoutes.js";
import UserRoutes from "./routes/UserRoutes.js";
import signuproute from "./routes/registration.js";
import imagecalorie from "./routes/imagecalorietracker.js";
import searchfood from "./routes/searchfood.js";

import logger from "./config/logger.js";
import fs from "fs";
import path from "path";
import cors from "cors";

dotenv.config();

const app = express();

// Set constants for better readability
const PORT = process.env.PORT || 8089;

// ====== Middleware Configuration ======
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// FIX: Only use the express.json with the high limit
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.set("trust proxy", 1);

// ====== Key Checks (Remains the same) ======
const keysDir = path.join(process.cwd(), "keys");
const privateKeyPath = path.join(keysDir, "private.key");
const publicKeyPath = path.join(keysDir, "public.key");

if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
  console.error("❌ RSA keys not found! Run 'node generateKeys.js' first.");
  process.exit(1);
}

// Keys loaded but not used here for brevity
// const privateKey = fs.readFileSync(privateKeyPath, "utf8");
// const publicKey = fs.readFileSync(publicKeyPath, "utf8");

// ==========================================================
// 🚀 ASYNC SERVER STARTUP FUNCTION (THE FIX)
// ==========================================================
async function startServer() {
  try {
    // 🛑 CRITICAL STEP: WAIT for the Mongoose connection to be READY
    // This prevents the buffer timeout error in the router.
    await connectDB();

    // ====== Routes ======
    app.use("/api/auth", otpRoutes);
    app.use("/api/register", signuproute);
    app.use("/api", UserRoutes);
    app.use("/api/food", searchfood);
    app.use("/api/track", imagecalorie); // Your calorie tracker route

    // ====== Health Check (Uses the existing connection state) ======
    app.get("/health", (req, res) => {
      // Mongoose.connection.readyState will be 1 (connected) or 2 (connecting)
      const dbStatus =
        mongoose.connection.readyState === 1 ? "connected" : "disconnected";

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
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    // If connectDB() fails, log it and prevent the server from running
    logger.error(
      "❌ CRITICAL FAILURE: Could not connect to MongoDB. Server not started.",
      err.message,
    );
    process.exit(1);
  }
}

startServer();
