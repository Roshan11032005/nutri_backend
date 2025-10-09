import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

/**
 * @route   POST /api/users
 * @desc    Register a new user
 * @access  Public
 */

//remove this shit
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

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      role,
      name,
      email,
      passwordHash,
      height,
      weight,
      healthConditions,
      subscription: { active: false }, // default subscription
    });

    await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
