// utils/sendJSON.js
import { Buffer } from "buffer";

/**
 * Send JSON response with proper headers and precomputed Content-Length
 * @param {import("express").Response} res - Express response object
 * @param {Object} payload - JSON payload to send
 * @param {number} status - HTTP status code (default 200)
 */
export const sendJSON = (res, payload, status = 200) => {
  const jsonString = JSON.stringify(payload);
  const byteLength = Buffer.byteLength(jsonString, "utf8");

  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", byteLength);
  res.end(jsonString);
};
