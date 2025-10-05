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

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth", otpRoutes);
app.use("/api/auth", refreshRoute);

// Health check endpoint
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

// Error handler
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: err.message || "Server Error" });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
