import express from "express";
import { sendOTP, verifyOTP } from "../repositories/otpRepository.js";
import { ipRateLimiter, usernameRateLimiter } from "../config/rateLimit.js";
import logger from "../config/logger.js";
import { signJWT, verifyJWT } from "../utils/jwt.js";
import requireLevel1JWT from "../middleware/level1Auth.js";
const router = express.Router();

/**
 * Send OTP and generate Level-1 JWT
 */
router.post("/send_email", ipRateLimiter, async (req, res) => {
  const { email, username } = req.body;

  if (!email && !username) {
    logger.warn("Send OTP failed: missing email or username", {
      body: req.body,
    });
    return res.status(400).json({ error: "Email or username is required" });
  }

  try {
    const otp = await sendOTP(email, username);
    const level1Token = signJWT({ username }, "10m"); // JWT valid for 10 mins

    logger.info("OTP sent successfully", { email, username });
    res.status(200).json({
      message: "OTP sent successfully",
      token: level1Token, // level-1 JWT
    });
  } catch (err) {
    logger.error("Failed to send OTP", { error: err.message, email, username });
    res.status(500).json({ error: "Failed to send OTP" });
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
      return res.status(400).json({ error: "OTP is required" });
    }

    try {
      const isValid = await verifyOTP(username, otp);

      if (!isValid) {
        logger.warn("Invalid or expired OTP", { username, otp });
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      logger.info("OTP verified successfully", { username });
      // TODO: Generate full JWT (Level-2) for authenticated session
      res.status(200).json({ message: "OTP verified successfully" });
    } catch (err) {
      logger.error("OTP verification failed", {
        error: err.message,
        username,
        otp,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
