import express from "express";
import { signJWT } from "../utils/jwt.js";
import logger from "../config/logger.js";
import requireRefreshJWT from "../middleware/verifyRefreshToken.js";
import { refreshTokenRateLimiter } from "../config/rateLimit.js";
import { sendJSON } from "../utils/sendJSON.js"; // your helper

const router = express.Router();

/**
 * Refresh session token
 */
router.post(
  "/refresh_token",
  refreshTokenRateLimiter,
  requireRefreshJWT,
  (req, res) => {
    const username = req.username;

    // Generate new session token (Level-2 JWT, 2 hours)
    const sessionToken = signJWT({ username, type: "l2" }, "2h");

    // Rotate refresh token (7 days)
    const refreshToken = signJWT({ username, type: "refresh" }, "7d");

    logger.info("Refresh token used successfully", { username });

    // Use sendJSON helper
    sendJSON(res, {
      message: "Token refreshed successfully",
      sessionToken,
      refreshToken,
    });
  },
);

export default router;
