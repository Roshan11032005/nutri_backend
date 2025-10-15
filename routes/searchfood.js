import { sendJSON } from "../utils/sendJSON.js";
import express from "express";
import logger from "../config/logger.js";
import axios from "axios";
import requireLevel2JWT from "../middleware/requireLevel2auth.js";
const router = express.Router();
import { searchRateLimiter } from "../config/rateLimit.js";
import dotenv from "dotenv";

const { EDAMAM_APP_ID, EDAMAM_APP_KEY } = process.env;

router.get("/search", async (req, res) => {
  const { query } = req.query;

  if (!query)
    return res.status(400).json({ error: "Query parameter required" });

  try {
    const url = `https://api.edamam.com/api/food-database/v2/parser?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}&ingr=${encodeURIComponent(query)}`;
    const response = await axios.get(url);
    logger.info("search badiya hogya");
    sendJSON(res, response.data);
  } catch (err) {
    logger.error(err);
    errorres = { error: "Failed to fetch from Edamam API" };
    sendJSON(res, errorres, 500);
  }
});

export default router;
