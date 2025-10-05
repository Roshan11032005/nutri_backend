// routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signJWT } from "../utils/jwt.js";
import { sendJSON } from "../utils/sendJSON.js";
import logger from "../config/logger.js";

const router = express.Router();

/**
 * Login endpoint
 * Accepts: { identifier: username or email, password }
 */
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    logger.warn("Login failed: missing identifier or password", {
      body: req.body,
    });
    return sendJSON(
      res,
      { error: "Username/email and password are required" },
      400,
    );
  }

  try {
    // Find user by email or name
    const user = await User.findOne({
      $or: [{ email: identifier }, { name: identifier }],
    });

    if (!user) {
      logger.warn("Login failed: user not found", { identifier });
      return sendJSON(res, { error: "Invalid credentials" }, 401);
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      logger.warn("Login failed: wrong password", { identifier });
      return sendJSON(res, { error: "Invalid credentials" }, 401);
    }

    // Generate session token (2 hours)
    const sessionToken = signJWT({ username: user.name, type: "l2" }, "2h");

    // Generate refresh token (7 days)
    const refreshToken = signJWT(
      { username: user.name, type: "refresh" },
      "7d",
    );

    logger.info("User logged in successfully", { identifier });

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

export default router;
