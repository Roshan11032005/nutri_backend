import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "./redisClient.js";

/**
 * Helper: create Redis-backed rate limiter
 */
const createRedisRateLimiter = ({ windowMs, max, keyGenerator, message }) =>
  rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    windowMs,
    max,
    keyGenerator,
    message: { error: message },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
  });

/**
 * Rate limit by IP (send_email / login endpoint)
 * IPv6-safe using ipKeyGenerator
 */
export const ipRateLimiter = createRedisRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: "Too many requests from this IP. Try again later.",
  keyGenerator: ipKeyGenerator, // ✅ IPv6 safe
});

/**
 * Rate limit by username/email (login endpoint)
 * Prevent brute-force login attempts per account
 */
export const loginRateLimiter = createRedisRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  message: "Too many login attempts. Try again later.",
  keyGenerator: (req) => req.body.identifier || req.ip,
});

/**
 * Rate limit by username/email (submit_otp endpoint)
 * Prevent too many OTP submissions per user per day
 */
export const usernameRateLimiter = createRedisRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 20,
  message: "Too many OTP attempts for this user today. Try again tomorrow.",
  keyGenerator: (req) => req.body.username || req.body.email,
});

/**
 * Rate limit by user ID or username (refresh_token endpoint)
 * Prevent abuse of refresh tokens
 */
export const refreshTokenRateLimiter = createRedisRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: "Too many token refresh requests. Try again later.",
  keyGenerator: (req) => req.userId || req.body.username,
});
