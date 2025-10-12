import { verifyJWT } from "../utils/jwt.js";
import logger from "../config/logger.js";
import redisClient from "../config/redisClient.js"; // import Redis client

export default async function requireRefreshJWT(req, res, next) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(
      `blacklist:refresh:${refreshToken}`,
    );
    if (isBlacklisted) {
      logger.warn("Attempt to use blacklisted refresh token", { refreshToken });
      return res.status(401).json({ error: "Refresh token has been revoked" });
    }

    // Verify token
    const decoded = verifyJWT(refreshToken);

    if (!decoded || decoded.type !== "refresh") {
      logger.warn("Invalid refresh token attempt", { refreshToken });
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    req.username = decoded.username;
    next();
  } catch (err) {
    logger.error("Refresh token verification failed", { error: err.message });
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}
