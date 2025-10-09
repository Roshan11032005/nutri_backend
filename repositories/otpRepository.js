import redisClient from "../config/redisClient.js";
import logger from "../config/logger.js";

/**
 * Generate a 6-digit OTP
 */
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * "Send" OTP instantly (logs to console instead of real email)
 * @param {string} username - unique identifier for Redis key
 */
export async function sendOTP(username) {
  const otp = generateOTP();
  const key = `otp:${username}`;
  const ttl = 10 * 60; // 10 minutes

  // Save OTP in Redis
  await redisClient.set(key, otp, { EX: ttl });

  // Log OTP instantly for dev
  logger.info(`[FAST OTP] Username: ${username}, OTP: ${otp}`);
  return otp;
}

/**
 * Verify OTP
 * @param {string} username
 * @param {string} otp - OTP provided by user
 */
export async function verifyOTP(username, otp) {
  const key = `otp:${username}`;
  const savedOtp = await redisClient.get(key);

  if (savedOtp && savedOtp === otp) {
    await redisClient.del(key);
    return true;
  }

  return false;
}
