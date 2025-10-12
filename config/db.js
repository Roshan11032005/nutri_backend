import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
import logger from "./logger.js";

dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
  logger.error("❌ MONGO_URI not found in environment variables.");
  process.exit(1);
}

let client = null;
let db = null;
let isConnecting = false;

export async function connectDB() {
  // If already connected, reuse existing db instance
  if (db) return db;

  // Prevent multiple concurrent connections
  if (isConnecting) {
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (db) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
    return db;
  }

  try {
    isConnecting = true;

    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();
    db = client.db("nutri_bowl");

    await db.command({ ping: 1 });
    logger.info("✅ Connected to MongoDB (nutri_bowl)");

    return db;
  } catch (err) {
    logger.error("❌ MongoDB connection error:", err);
    throw err;
  } finally {
    isConnecting = false;
  }
}

export function getDB() {
  if (!db) {
    throw new Error("❌ Database not connected. Call connectDB() first.");
  }
  return db;
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info("🛑 MongoDB connection closed");
  }
}
