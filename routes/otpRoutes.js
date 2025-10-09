import express from "express";
import { sendOTP, verifyOTP } from "../repositories/otpRepository.js";
import { ipRateLimiter, usernameRateLimiter } from "../config/rateLimit.js";
import User from "../models/User.js";
import logger from "../config/logger.js";
import { signJWT } from "../utils/jwt.js";
import requireLevel1JWT from "../middleware/level1Auth.js";
import { Buffer } from "buffer";

const router = express.Router();

// Helper to send JSON
const sendJSON = (res, payload, status = 200) => {
  const jsonString = JSON.stringify(payload);
  const byteLength = Buffer.byteLength(jsonString, "utf8");
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", byteLength);
  res.end(jsonString);
};

/**
 * Send OTP and generate Level-1 JWT
 */
router.post("/send_email", ipRateLimiter, async (req, res) => {
  const { email, username } = req.body;

  if (!email && !username) {
    logger.warn("Send OTP failed: missing email or username", {
      body: req.body,
    });
    return sendJSON(res, { error: "Email or username is required" }, 400);
  }

  try {
    // Dev/test user
    let userIdentifier;
    if (email === "roshanzameer000111@gmail.com") {
      userIdentifier = "roshan"; // username as Redis key
    } else {
      const user = await User.findOne({
        $or: [{ email: email || null }, { name: username || null }],
      });
      if (!user) {
        logger.warn("Send OTP failed: user not found", { email, username });
        return sendJSON(res, { error: "User not found" }, 404);
      }
      userIdentifier = user.name; // username as Redis key
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
    const username = req.username; // from JWT

    if (!otp) {
      logger.warn("Submit OTP failed: missing OTP", { username });
      return sendJSON(res, { error: "OTP is required" }, 400);
    }

    try {
      const isValid = await verifyOTP(username, otp);

      if (!isValid) {
        logger.warn("Invalid or expired OTP", { username, otp });
        return sendJSON(res, { error: "Invalid or expired OTP" }, 400);
      }

      logger.info("OTP verified successfully", { username });

      // Level-2 JWT (session token, 2 hours)
      const sessionToken = signJWT({ username, type: "l2" }, "2h");

      // Refresh token (7 days)
      const refreshToken = signJWT({ username, type: "refresh" }, "7d");

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

export default router;
