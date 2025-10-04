import fs from "fs";
import jwt from "jsonwebtoken";

const PRIVATE_KEY = fs.readFileSync("keys/private.key", "utf8");
const PUBLIC_KEY = fs.readFileSync("keys/public.key", "utf8");

/**
 * Generate JWT
 * @param {Object} payload - e.g., { username }
 * @param {String} expiresIn - e.g., '10m'
 */
export function signJWT(payload, expiresIn = "10m") {
  return jwt.sign(payload, PRIVATE_KEY, { algorithm: "RS256", expiresIn });
}

/**
 * Verify JWT
 */
export function verifyJWT(token) {
  try {
    return jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] });
  } catch (err) {
    return null;
  }
}
