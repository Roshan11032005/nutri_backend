// routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import { Buffer } from "buffer";
import redisClient from "../config/redisClient.js";
import requireLevel2JWT from "../middleware/requireLevel2auth.js";
import { sendOTP, verifyOTP } from "../repositories/otpRepository.js";
import {
  ipRateLimiter,
  usernameRateLimiter, // Retained but could be renamed/removed
  refreshTokenRateLimiter,
  loginRateLimiter,
} from "../config/rateLimit.js";
import { getDB } from "../config/db.js";
import logger from "../config/logger.js";
import { signJWT, verifyJWT } from "../utils/jwt.js"; // Ensure verifyJWT is imported
import requireLevel1JWT from "../middleware/level1Auth.js";
import requireRefreshJWT from "../middleware/verifyRefreshToken.js";
import { ObjectId } from "mongodb"; // Necessary for casting user_id back from string

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
  // 🚨 ONLY ACCEPT EMAIL 🚨
  const { email } = req.body;
  logger.info("Received OTP request", { email });

  if (!email) {
    logger.warn("No email provided");
    return sendJSON(res, { error: "Email is required" }, 400);
  }

  try {
    const db = getDB();
    if (!db) {
      logger.error("Database not connected");
      throw new Error("Database not connected");
    } // 🚨 Simplified Query: Find user by email ONLY 🚨

    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });

    if (!user) {
      logger.warn("User not found in database", { email });
      return sendJSON(res, { error: "User not found" }, 404);
    }

    const userEmail = user.email;
    const userName = user.name || user.email; // Use name or fallback to email for OTP
    const userIdString = user._id.toString(); // 🚨 Get MongoDB _id 🚨

    logger.info("User found", { userEmail, userName, userIdString });

    let otp;
    try {
      logger.info("Sending OTP via nodemailer...", { userEmail, userName }); // OTP verification key will be based on the email
      otp = await sendOTP(userEmail, userEmail, "signup");
      logger.info("OTP sent successfully", { userEmail, otp });
    } catch (otpErr) {
      logger.error("sendOTP failed", {
        error: otpErr.message,
        stack: otpErr.stack,
        userEmail,
      });
      return sendJSON(res, { error: "Failed to send OTP" }, 500);
    }

    // 🚨 Store the necessary data in Redis using the email as the key 🚨
    await redisClient.set(
      `otp_session:${userEmail}`,
      JSON.stringify({ userId: userIdString }),
      {
        EX: 600, // 10 min
      },
    ); // Sign Level-1 token using the email as the username payload (as the identifier)

    const level1Token = signJWT({ username: userEmail, type: "l1" }, "50m");
    logger.info("Returning Level-1 JWT", { userEmail });

    return sendJSON(res, {
      message: "Verification OTP sent to your email",
      token: level1Token,
    });
  } catch (err) {
    logger.error("Unhandled error in /send_email", {
      error: err.message,
      stack: err.stack,
      email,
    });
    return sendJSON(res, { error: "Failed to send OTP" }, 500);
  }
});

/**
 * Submit OTP (requires Level-1 JWT)
 */
router.post(
  "/submit_otp",
  usernameRateLimiter, // Now acts as email rate limiter
  requireLevel1JWT,
  async (req, res) => {
    const { otp } = req.body;
    const email = req.username; // Identifier is now the email from the L1 JWT
    if (!otp) return sendJSON(res, { error: "OTP is required" }, 400);

    try {
      const isValid = await verifyOTP(email, otp); // Verify using email as the key
      if (!isValid)
        return sendJSON(res, { error: "Invalid or expired OTP" }, 400);

      // 🚨 Retrieve userId from Redis using email key 🚨
      const sessionDataJson = await redisClient.get(`otp_session:${email}`);
      if (!sessionDataJson) {
        return sendJSON(
          res,
          { error: "OTP session data expired or missing" },
          400,
        );
      }
      const sessionData = JSON.parse(sessionDataJson);
      const userId = sessionData.userId; // This is the user's MongoDB _id string

      // Cleanup Redis data
      await redisClient.del(`otp_session:${email}`);

      // 🚨 SIGN TOKENS WITH USER ID 🚨
      const sessionToken = signJWT(
        { username: email, user_id: userId, type: "l2" },
        "2h",
      );
      const refreshToken = signJWT(
        { username: email, user_id: userId, type: "refresh" },
        "7d",
      );

      logger.info("OTP verified successfully", { email, userId });
      return sendJSON(res, {
        message: "OTP verified successfully",
        sessionToken,
        refreshToken,
        user_id: userId, // Return the ID to the client
      });
    } catch (err) {
      logger.error("OTP verification failed", {
        error: err.message,
        email,
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
    const username = req.username; // This is the email
    const userId = req.user_id; // Assumed extracted by middleware
    // 🚨 SIGN NEW TOKENS WITH USER ID 🚨

    const sessionToken = signJWT(
      { username, user_id: userId, type: "l2" },
      "2h",
    );
    const refreshToken = signJWT(
      { username, user_id: userId, type: "refresh" },
      "7d",
    );

    logger.info("Refresh token used successfully", { username, userId });
    return sendJSON(res, {
      message: "Token refreshed successfully",
      sessionToken,
      refreshToken,
    });
  },
);

/**
 * Login with email and password
 */
router.post("/login", loginRateLimiter, async (req, res) => {
  // 🚨 identifier must now be the email 🚨
  const { identifier: email, password } = req.body;
  if (!email || !password)
    return sendJSON(res, { error: "Email and password are required" }, 400);

  try {
    const db = getDB();
    if (!db) throw new Error("Database not connected"); // 🚨 Simplified Query: Find user by email ONLY 🚨

    const user = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });

    if (!user) return sendJSON(res, { error: "Invalid credentials" }, 401);

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return sendJSON(res, { error: "Invalid credentials" }, 401);

    // 🚨 Extract and stringify the MongoDB _id 🚨
    const userIdString = user._id.toString();

    // 🚨 SIGN TOKENS WITH USER ID 🚨
    const sessionToken = signJWT(
      { username: user.email, user_id: userIdString, type: "l2" },
      "2h",
    );
    const refreshToken = signJWT(
      { username: user.email, user_id: userIdString, type: "refresh" },
      "7d",
    );

    logger.info("✅ User logged in successfully", {
      email,
      userId: userIdString,
    });
    return sendJSON(res, {
      message: "Login successful",
      sessionToken,
      refreshToken,
      user_id: userIdString, // Return the ID to the client
    });
  } catch (err) {
    logger.error("Login failed", { error: err.message });
    return sendJSON(res, { error: "Internal server error" }, 500);
  }
});

router.post("/logout", requireLevel2JWT, async (req, res) => {
  const { refreshToken } = req.body;
  const sessionToken = req.token;
  const username = req.username; // This is the email

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
    } // Blacklist tokens in Redis

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
