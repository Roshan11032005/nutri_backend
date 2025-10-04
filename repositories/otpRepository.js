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
  const ttl = 10 * 60; // 10 minutes in seconds

  // Save OTP in Redis with TTL
  await redisClient.set(key, otp, { EX: ttl });

  // SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"Nutri App" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your OTP Code",
    text: `Hello ${username},\n\nYour OTP is: ${otp}. It is valid for 10 minutes.\n`,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`✅ OTP sent to ${email}`);
    return otp;
  } catch (err) {
    logger.error("❌ Failed to send OTP:", err);
    throw err;
  }
}

/**
 * Verify OTP for a username
 * @param {string} username
 * @param {string} otp - OTP provided by user
 * @returns {Promise<boolean>}
 */
export async function verifyOTP(username, otp) {
  const key = `otp:${username}`;
  const savedOtp = await redisClient.get(key);

  if (savedOtp && savedOtp === otp) {
    await redisClient.del(key); // remove after successful verification
    return true;
  }

  return false;
}
