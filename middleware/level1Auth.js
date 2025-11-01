import { verifyJWT } from "../utils/jwt.js";

/**
 * Middleware to verify Level-1 JWT (used for intermediate steps like OTP verification).
 * The 'username' property is the user's email address.
 */
export default function requireLevel1JWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Level-1 token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyJWT(token); // 1. Check if token is valid, correct type ('l1'), and has the identifier ('username' is the email)

    if (!decoded || decoded.type !== "l1" || !decoded.username) {
      return res
        .status(401)
        .json({ error: "Invalid or expired Level-1 token" });
    } // 2. Attach the identifier (email) to the request object

    req.username = decoded.username;

    // Note: The user_id is NOT expected or required here, as the user is not fully authenticated yet.

    next();
  } catch (err) {
    // Log the error for internal debugging
    console.error("Level-1 JWT Verification Failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired Level-1 token" });
  }
}
