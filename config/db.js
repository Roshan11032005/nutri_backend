// config/db.js
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
import logger from "./logger.js";

dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
  logger.error("❌ MONGO_URI not found in environment variables.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

export async function connectDB() {
  try {
    await client.connect();
    db = client.db("nutri_bowl");
    await db.command({ ping: 1 });
    logger.info("✅ Connected to MongoDB (nutri_bowl)");
  } catch (err) {
    logger.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

export function getDB() {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  return db;
}
