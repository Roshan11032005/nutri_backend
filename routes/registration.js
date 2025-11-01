// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import { sendOTP, verifyOTP } from "../repositories/otpRepository.js";
import User from "../models/User.js";
import { ipRateLimiter } from "../config/rateLimit.js";
import { signJWT } from "../utils/jwt.js";
import requireLevel1JWT from "../middleware/SIgnupMiddleware.js";

const router = express.Router();

/**
 * Step 1: Receive signup details and send verification OTP
 */
router.post("/signup", ipRateLimiter, async (req, res) => {
  const { name, email, username, passwordHash, mobileNumber } = req.body;

  try {
    // Check if user already exists
    const existing = await User.findOne({
      $or: [{ email }, { mobileNumber }],
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Email or mobile number already registered" });
    }

    // Temporarily store user data in Redis
    const signupData = { name, email, username, passwordHash, mobileNumber };
    await redisClient.set(`signup:${username}`, JSON.stringify(signupData), {
      EX: 600,
    }); // 10 min
    const token = signJWT({ username: username, type: "signup" });
    // Send OTP
    await sendOTP(email, username, "signup");
    res.json({ message: "Verification OTP sent to your email", token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup OTP sending failed" });
  }
});

/**
 * Step 2: Verify OTP and create account
 */
router.post(
  "/verify-signup",
  ipRateLimiter,
  requireLevel1JWT,
  async (req, res) => {
    const { username, otp } = req.body;

    try {
      const isValid = await verifyOTP(username, otp, "signup");
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      const signupDataJson = await redisClient.get(`signup:${username}`);
      if (!signupDataJson) {
        return res.status(400).json({ message: "Signup data expired" });
      }

      const signupData = JSON.parse(signupDataJson);

      // 🔒 Hash the password securely before storing
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(signupData.passwordHash, salt);

      const user = await User.create({
        ...signupData,
        passwordHash: hashedPassword,
        verified: true,
        role: "user",
      });

      await redisClient.del(`signup:${username}`); // cleanup Redis data

      res.json({ message: "Signup successful", user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Verification failed" });
    }
  },
);
export default router;
