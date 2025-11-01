// utils/otpService.js
import redisClient from "../config/redisClient.js";
import nodemailer from "nodemailer";
import logger from "../config/logger.js";

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(email, username, type = "login") {
  const otp = generateOTP();
  const key = `otp:${type}:${username}`;
  const ttl = 10 * 60; // 10 minutes

  await redisClient.set(key, otp, { EX: ttl });
  logger.info(`OTP stored in Redis for ${type}:${username}`, { otp });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const subject =
    type === "signup"
      ? "Verify your email - NutriBowl Signup"
      : "Your NutriBowl Login OTP";

  const text =
    type === "signup"
      ? `Hello ${username}, thank you for signing up! Your verification OTP is ${otp}`
      : `Hello ${username}, your login OTP is ${otp}`;

  await transporter.sendMail({
    from: `"NutriBowl" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    text,
  });

  logger.info(`OTP email sent for ${type}`, { email, username, otp });
  return otp;
}

export async function verifyOTP(username, otp, type = "login") {
  const key = `otp:${type}:${username}`;
  const savedOtp = await redisClient.get(key);

  if (savedOtp && savedOtp === otp) {
    await redisClient.del(key);
    return true;
  }

  return false;
}
