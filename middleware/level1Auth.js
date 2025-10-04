import { verifyJWT } from "../utils/jwt.js";

/**
 * Middleware to verify Level-1 JWT
 */
export default function requireLevel1JWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Level-1 token" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyJWT(token);

  if (!decoded || decoded.type !== "l1" || !decoded.username) {
    return res.status(401).json({ error: "Invalid or expired Level-1 token" });
  }

  req.username = decoded.username;
  next();
}
