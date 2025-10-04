import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "./redisClient.js";

/**
 * Rate limit by IP (send_email endpoint)
 */
export const ipRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // max 5 requests per IP per hour
  message: "Too many requests from this IP. Try again later.",
});

/**
 * Rate limit by username (submit_otp endpoint)
 */
export const usernameRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  keyGenerator: (req) => req.body.username || req.body.email,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 20, // max 20 OTP submissions per username per day
  message: "Too many OTP attempts for this user today. Try again tomorrow.",
});
