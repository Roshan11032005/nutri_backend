// requireRefreshJWT.js

import { verifyJWT } from "../utils/jwt.js";
import logger from "../config/logger.js";
import redisClient from "../config/redisClient.js"; // import Redis client

export default async function requireRefreshJWT(req, res, next) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    // 1. Check if token is blacklisted
    const isBlacklisted = await redisClient.get(
      `blacklist:refresh:${refreshToken}`,
    );
    if (isBlacklisted) {
      logger.warn("Attempt to use blacklisted refresh token", { refreshToken });
      return res.status(401).json({ error: "Refresh token has been revoked" });
    } // 2. Verify token

    const decoded = verifyJWT(refreshToken); // 3. Validate Token Type and Required fields

    if (!decoded || decoded.type !== "refresh" || !decoded.user_id) {
      logger.warn("Invalid refresh token attempt (Type/ID missing)", {
        refreshToken,
        decoded,
      });
      return res.status(401).json({ error: "Invalid refresh token" });
    } // 4. Attach required data to request object

    req.username = decoded.username; // The user's email
    req.user_id = decoded.user_id; // 🚨 ATTACH USER'S MONGODB ID 🚨
    req.token = refreshToken; // Attach the token itself for easy reference in the refresh route

    next();
  } catch (err) {
    logger.error("Refresh token verification failed", {
      error: err.message,
      refreshToken,
    });
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}
