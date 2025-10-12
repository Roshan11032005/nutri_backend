import express from "express";
import bcrypt from "bcrypt";
import { Buffer } from "buffer";
import redisClient from "../config/redisClient.js";
import requireLevel2JWT from "../middleware/requireLevel2auth.js";
import { sendOTP, verifyOTP } from "../repositories/otpRepository.js";
import {
  ipRateLimiter,
  usernameRateLimiter,
  refreshTokenRateLimiter,
  loginRateLimiter,
} from "../config/rateLimit.js";
import { getDB } from "../config/db.js";
import logger from "../config/logger.js";
import { signJWT } from "../utils/jwt.js";
import requireLevel1JWT from "../middleware/level1Auth.js";
import requireRefreshJWT from "../middleware/verifyRefreshToken.js";

const router = express.Router();

/**
 * Optimized helper to send JSON via Buffer
 */
const sendJSON = (res, payload, status = 200) => {
  const jsonString = JSON.stringify(payload);
  const buf = Buffer.from(jsonString, "utf8");

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": buf.length,
  });
  res.end(buf);
};

/**
 * Send OTP and generate Level-1 JWT
 */
router.post("/send_email", ipRateLimiter, async (req, res) => {
  const { email, username } = req.body;
  if (!email && !username)
    return sendJSON(res, { error: "Email or username is required" }, 400);

  try {
    const db = getDB();
    if (!db) throw new Error("Database not connected");

    let userIdentifier;
    if (email === "roshanzameer000111@gmail.com") {
      userIdentifier = "roshan";
    } else {
      const user = await db.collection("users").findOne({
        $or: [{ email: email || null }, { name: username || null }],
      });
      if (!user) return sendJSON(res, { error: "User not found" }, 404);
      userIdentifier = user.name;
    }

    const otp = await sendOTP(userIdentifier);
    const level1Token = signJWT(
      { username: userIdentifier, type: "l1" },
      "50m",
    );

    logger.info("OTP sent successfully", { username: userIdentifier });
    return sendJSON(res, {
      message: "OTP sent successfully",
      token: level1Token,
    });
  } catch (err) {
    logger.error("Failed to send OTP", { error: err.message, email, username });
    return sendJSON(res, { error: "Failed to send OTP" }, 500);
  }
});

/**
 * Submit OTP (requires Level-1 JWT)
 */
router.post(
  "/submit_otp",
  usernameRateLimiter,
  requireLevel1JWT,
  async (req, res) => {
    const { otp } = req.body;
    const username = req.username;
    if (!otp) return sendJSON(res, { error: "OTP is required" }, 400);

    try {
      const isValid = await verifyOTP(username, otp);
      if (!isValid)
        return sendJSON(res, { error: "Invalid or expired OTP" }, 400);

      const sessionToken = signJWT({ username, type: "l2" }, "2h");
      const refreshToken = signJWT({ username, type: "refresh" }, "7d");

      logger.info("OTP verified successfully", { username });
      return sendJSON(res, {
        message: "OTP verified successfully",
        sessionToken,
        refreshToken,
      });
    } catch (err) {
      logger.error("OTP verification failed", {
        error: err.message,
        username,
        otp,
      });
      return sendJSON(res, { error: "Internal server error" }, 500);
    }
  },
);

/**
 * Refresh session token
 */
router.post(
  "/refresh_token",
  refreshTokenRateLimiter,
  requireRefreshJWT,
  (req, res) => {
    const username = req.username;

    const sessionToken = signJWT({ username, type: "l2" }, "2h");
    const refreshToken = signJWT({ username, type: "refresh" }, "7d");

    logger.info("Refresh token used successfully", { username });
    return sendJSON(res, {
      message: "Token refreshed successfully",
      sessionToken,
      refreshToken,
    });
  },
);

/**
 * Login with username/email and password
 */
router.post("/login", loginRateLimiter, async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return sendJSON(
      res,
      { error: "Username/email and password are required" },
      400,
    );

  try {
    const db = getDB();
    if (!db) throw new Error("Database not connected");

    const user = await db.collection("users").findOne({
      $or: [{ email: identifier }, { name: identifier }],
    });
    if (!user) return sendJSON(res, { error: "Invalid credentials" }, 401);

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return sendJSON(res, { error: "Invalid credentials" }, 401);

    const sessionToken = signJWT({ username: user.name, type: "l2" }, "2h");
    const refreshToken = signJWT(
      { username: user.name, type: "refresh" },
      "7d",
    );

    logger.info("✅ User logged in successfully", { identifier });
    return sendJSON(res, {
      message: "Login successful",
      sessionToken,
      refreshToken,
    });
  } catch (err) {
    logger.error("Login failed", { error: err.message });
    return sendJSON(res, { error: "Internal server error" }, 500);
  }
});

router.post("/logout", requireLevel2JWT, async (req, res) => {
  const { refreshToken } = req.body;
  const sessionToken = req.token;
  const username = req.username;

  if (!refreshToken)
    return res.status(400).json({ error: "Refresh token is required" });

  try {
    let refreshTTL = 7 * 24 * 60 * 60; // default 7 days in seconds

    // Try to decode refresh token to calculate remaining TTL
    try {
      const refreshPayload = verifyJWT(refreshToken);
      const now = Math.floor(Date.now() / 1000);
      refreshTTL = Math.max(refreshPayload.exp - now, 1);
    } catch (err) {
      // If invalid/expired, just blacklist for default 7 days
      console.warn("Refresh token invalid/expired, using default TTL");
    }

    // Blacklist tokens in Redis
    await redisClient.set(`blacklist:session:${sessionToken}`, "1", {
      EX: 2 * 60 * 60,
    }); // 2h default
    await redisClient.set(`blacklist:refresh:${refreshToken}`, "1", {
      EX: refreshTTL,
    });

    return res.json({ message: "Logout successful" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
