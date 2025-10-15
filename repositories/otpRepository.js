import redisClient from "../config/redisClient.js";
import nodemailer from "nodemailer";
import logger from "../config/logger.js";

/**
 * Generate a 6-digit numeric OTP
 */
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via email and save in Redis
 * @param {string} email - user email
 * @param {string} username - unique username
 * @returns {Promise<string>} OTP sent
 */
export async function sendOTP(email, username) {
  const otp = generateOTP();
  const key = `otp:${username}`;
  const ttl = 10 * 60; // 10 minutes

  // Save OTP in Redis
  try {
    await redisClient.set(key, otp, { EX: ttl });
    logger.info(`OTP stored in Redis for ${username}`, { otp });
  } catch (err) {
    logger.error("Redis set failed", { error: err.message, username });
    throw err;
  }

  // Configure transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify SMTP connection
  try {
    await transporter.verify();
    logger.info("SMTP connection verified successfully");
  } catch (err) {
    logger.error("SMTP verification failed", { error: err.message });
    throw err;
  }

  // Send OTP email
  try {
    await transporter.sendMail({
      from: `"NutriBowl" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your OTP",
      text: `Hello ${username}, your OTP is ${otp}`,
    });
    logger.info("OTP email sent successfully", { email, username, otp });
  } catch (err) {
    logger.error("Failed to send OTP email", {
      error: err.message,
      email,
      username,
    });
    throw err;
  }

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
