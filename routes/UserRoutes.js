import express from "express";
import bcrypt from "bcryptjs";
import { getDB } from "../config/db.js";
import logger from "../config/logger.js";

const router = express.Router();

/**
 * @route   POST /api/users/adduser
 * @desc    Register a new user
 * @access  Public
 */

router.post("/adduser", async (req, res) => {
  try {
    const { role, name, email, password, height, weight, healthConditions } =
      req.body;

    // Basic validation
    if (!role || !name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });
    }

    // Get DB connection (already connected globally)
    const db = getDB();
    const users = db.collection("users");

    // Check if user already exists
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await users.insertOne({
      role,
      name,
      email,
      passwordHash,
      height,
      weight,
      healthConditions,
      subscription: { active: false }, // default subscription
      createdAt: new Date(),
    });

    // Response
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: result.insertedId,
        name,
        email,
        role,
      },
    });
  } catch (error) {
    console.error("❌ Error creating user:", error);
    logger.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
