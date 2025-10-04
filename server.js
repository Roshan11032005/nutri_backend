// server.js
import express from "express";
import dotenv from "dotenv";
import { connectDB, getDB } from "./config/db.js";

import logger from "./config/logger.js";
import { Buffer } from "buffer";

dotenv.config();

const app = express();
app.use(express.json());

// Connect DB
connectDB();

// Health endpoint
app.get("/health", async (req, res) => {
  let dbStatus = "disconnected";

  try {
    // Ping MongoDB to check connectivity
    const db = getDB();
    await db.command({ ping: 1 });
    dbStatus = "connected";
    logger.info("sabh chnagasi");
  } catch (err) {
    logger.error("MongoDB health check failed:", err);
    dbStatus = "disconnected";
    logger.info("chudgaya guru");
  }

  // Build payload
  const payload = {
    status: "ok",
    message: "Server healthy",
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  // Serialize JSON and precompute byte length
  const jsonString = JSON.stringify(payload);
  const byteLength = Buffer.byteLength(jsonString, "utf8");

  // Set headers
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", byteLength);

  // Send response in one contiguous write (no chunked transfer)
  res.end(jsonString);
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: err.message || "Server Error" });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: err.message || "Server Error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));
