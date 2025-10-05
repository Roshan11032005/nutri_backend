import { verifyJWT } from "../utils/jwt.js";
import logger from "../config/logger.js";

export default function requireRefreshJWT(req, res, next) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    const decoded = verifyJWT(refreshToken);

    if (!decoded || decoded.type !== "refresh") {
      logger.warn("Invalid refresh token attempt");
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    req.username = decoded.username;
    next();
  } catch (err) {
    logger.error("Refresh token verification failed", { error: err.message });
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}
