import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
import logger from "./logger.js";

dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
  logger.error("❌ MONGO_URI not found in environment variables.");
  process.exit(1);
}

let client;
let db;

export async function connectDB() {
  try {
    // Reuse existing connection if possible
    if (db) return db;

    if (!client) {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });
      await client.connect();
    }

    db = client.db("nutri_bowl");
    await db.command({ ping: 1 });
    logger.info("✅ Connected to MongoDB (nutri_bowl)");
    return db;
  } catch (err) {
    logger.error("❌ MongoDB connection error:", err);
    throw err; // Do not exit in serverless
  }
}
