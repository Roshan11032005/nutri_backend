// server.js
import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import otpRoutes from "./routes/otpRoutes.js";
import refreshRoute from "./routes/refreshToken.js";
import logger from "./config/logger.js";

dotenv.config();

const app = express();
app.use(express.json());

await connectDB(); // Wait for DB connection before handling requests

app.use("/api/auth", otpRoutes);
app.use("/api/auth", refreshRoute);

app.get("/health", async (req, res) => {
  let dbStatus = "disconnected";
  try {
    const db = await connectDB(); // Reuse connection
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

// Error handler
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: err.message || "Server Error" });
});

export default app; // ✅ Export app for Vercel
