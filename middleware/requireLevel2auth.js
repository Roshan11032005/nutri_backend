// requireLevel2auth.js

import { verifyJWT } from "../utils/jwt.js";
import redisClient from "../config/redisClient.js";

export default async function requireLevel2JWT(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "Authorization token missing" });

    const token = authHeader.split(" ")[1];
    const decoded = verifyJWT(token); // 1. Validate Token Type

    if (!decoded || decoded.type !== "l2")
      return res.status(401).json({ error: "Invalid session token" });

    // 2. Validate User ID presence (CRITICAL for database operations)
    if (!decoded.user_id)
      return res.status(401).json({ error: "Token is missing user ID" }); // 3. Check if token is blacklisted

    const blacklisted = await redisClient.get(`blacklist:session:${token}`);
    if (blacklisted)
      return res.status(401).json({ error: "Token is blacklisted" }); // 4. Attach data to request object

    req.token = token;
    req.username = decoded.username; // This is the user's email
    req.user_id = decoded.user_id; // 🚨 ATTACH USER'S MONGODB ID 🚨

    next();
  } catch (err) {
    // Log the error internally for debugging purposes
    console.error("JWT Verification Error:", err.message);
    return res.status(401).json({ error: "Invalid or expired session token" });
  }
}
