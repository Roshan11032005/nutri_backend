// server.js
import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { connectDB } from "./config/db.js";
import otpRoutes from "./routes/otpRoutes.js";
import refreshRoute from "./routes/refreshToken.js";
import logger from "./config/logger.js";

dotenv.config();

const app = express();
app.use(express.json());

// ====== RSA Key Generation ======
const keysDir = path.join(process.cwd(), "keys");
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir);
}

const privateKeyPath = path.join(keysDir, "private.key");
const publicKeyPath = path.join(keysDir, "public.key");

if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
  console.log("Generating RSA key pair...");

  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  fs.writeFileSync(privateKeyPath, privateKey);
  fs.writeFileSync(publicKeyPath, publicKey);

  console.log("RSA key pair generated at /keys");
}

// ====== Connect to MongoDB ======
connectDB();

// ====== Routes ======
app.use("/api/auth", otpRoutes);
app.use("/api/auth", refreshRoute);

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

// ====== Error Handler ======
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: err.message || "Server Error" });
});

// ====== Start Server ======
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
