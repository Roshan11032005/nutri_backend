// requireLevel2auth.js
import { verifyJWT } from "../utils/jwt.js";
import redisClient from "../config/redisClient.js";

export default async function requireLevel2JWT(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "Authorization token missing" });

    const token = authHeader.split(" ")[1];
    const decoded = verifyJWT(token);

    if (!decoded || decoded.type !== "l2")
      return res.status(401).json({ error: "Invalid session token" });

    // Check if token is blacklisted
    const blacklisted = await redisClient.get(`blacklist:session:${token}`);
    if (blacklisted)
      return res.status(401).json({ error: "Token is blacklisted" });

    req.token = token;
    req.username = decoded.username;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session token" });
  }
}
