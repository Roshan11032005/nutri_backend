// routes/calorie.routes.js (REVISED for Native MongoDB Driver)

import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import sharp from "sharp";
// 🚨 USE NATIVE DRIVER FUNCTIONS 🚨
import { ObjectId } from "mongodb"; // Import from the 'mongodb' package
import { getDB } from "../config/db.js"; // Import your native driver function
import requireLevel2JWT from "../middleware/requireLevel2auth.js";

const router = Router();
const ai = new GoogleGenAI({});

router.post("/image", requireLevel2JWT, async (req, res) => {
  // 1. Input Validation and Setup
  const { user_id, image_base64, mealType } = req.body;
  const rawBase64Data = image_base64 ? image_base64.split(",").pop() : null; // --- Basic Input Checks (Remains the same) ---

  if (!user_id || !rawBase64Data || !mealType) {
    return res.status(400).json({
      error: "Missing required data.",
      tip: "Request body must contain user_id, image_base64, and mealType.",
    });
  }

  const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];
  const lowerMealType = mealType.toLowerCase();
  if (!validMealTypes.includes(lowerMealType)) {
    return res.status(400).json({
      error:
        "Invalid mealType provided. Must be one of: " +
        validMealTypes.join(", "),
    });
  }

  try {
    // 🛑 STEP 1: Get the native DB object and verify user 🛑
    const db = getDB();
    const usersCollection = db.collection("users"); // Access the native 'users' collection

    // Check if user_id is a valid MongoDB ObjectId string
    if (!ObjectId.isValid(user_id)) {
      return res.status(400).json({ error: "Invalid user_id format." });
    }

    const userObjectId = new ObjectId(user_id);
    // Use native driver's findOne method
    const userExists = await usersCollection.findOne({ _id: userObjectId });

    if (!userExists) {
      return res.status(404).json({ error: "User not found." });
    } // 2. IMAGE OPTIMIZATION with SHARP (Remains the same)

    const imageBuffer = Buffer.from(rawBase64Data, "base64");
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(1024, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const optimizedBase64Data = optimizedBuffer.toString("base64"); // 3. STRUCTURED OUTPUT SCHEMA (Remains the same)

    // NOTE: This schema definition is entirely local and does not rely on Mongoose.
    const calorieSchema = {
      type: Type.OBJECT,
      properties: {
        food_item: {
          type: Type.STRING,
          description: "The identified main food item.",
        },
        estimated_calories: {
          type: Type.INTEGER,
          description: "Estimated total calories (integer).",
        },
        estimated_protein_g: {
          type: Type.INTEGER,
          description: "Estimated protein content in grams (g).",
        },
        estimated_fat_g: {
          type: Type.INTEGER,
          description: "Estimated total fat content in grams (g).",
        },
        estimated_carbs_g: {
          type: Type.INTEGER,
          description: "Estimated total carbohydrate content in grams (g).",
        },
        serving_size_g: {
          type: Type.INTEGER,
          description: "Estimated weight of the serving in grams (g).",
        },
        confidence_score: {
          type: Type.NUMBER,
          description: "A score from 0.0 to 1.0 indicating confidence.",
        },
      },
      required: [
        "food_item",
        "estimated_calories",
        "estimated_protein_g",
        "estimated_fat_g",
        "estimated_carbs_g",
        "serving_size_g",
      ],
    }; // 4. Prepare Gemini Request (Remains the same)

    const imagePart = {
      inlineData: { data: optimizedBase64Data, mimeType: "image/webp" },
    };
    const prompt =
      "Analyze this food image. Identify the food, estimate its total calories, serving size in grams, and the breakdown of protein, fat, and carbohydrates in grams. Respond STRICTLY in the requested JSON schema. Be a nutrition expert. Note: The image has been optimized to WebP.";
    const config = {
      responseMimeType: "application/json",
      responseSchema: calorieSchema,
    }; // 5. Call Gemini API (Remains the same)

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [imagePart, { text: prompt }],
      config: config,
    });
    const calorieDetails = JSON.parse(response.text); // 🛑 STEP 2: LOGGING using native driver 🛑

    const foodLogsCollection = db.collection("foodlogs");

    const logEntry = {
      // Map fields for native MongoDB document
      userId: userExists._id, // Use the verified native ObjectId
      food_item_name: calorieDetails.food_item,
      quantity: calorieDetails.serving_size_g,
      calories: calorieDetails.estimated_calories,
      protein_g: calorieDetails.estimated_protein_g,
      fat_g: calorieDetails.estimated_fat_g,
      carbs_g: calorieDetails.estimated_carbs_g,
      mealType: lowerMealType,
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await foodLogsCollection.insertOne(logEntry); // Native driver insert
    const log_id = result.insertedId; // 6. Success Response

    res.json({
      status: "success",
      message: "Full nutritional profile analyzed and logged to FoodLogs.",
      log_id: log_id, // Return the native ObjectId
      user_id: user_id,
      analysis: calorieDetails,
    });
  } catch (error) {
    console.error("API Error (Sharp/Gemini/DB):", error); // Since Mongoose is no longer running the query, the timeout error will now be a native driver error.
    const isNativeDBError =
      error.name === "MongoTimeoutError" || error.name === "MongoNetworkError";
    const isImageError =
      error.message &&
      error.message.includes("Input buffer contains unsupported");

    let statusCode;
    if (isImageError) {
      statusCode = 400;
    } else if (
      isNativeDBError ||
      error.message.includes("buffering timed out")
    ) {
      // Still treat any connection failure as a server problem
      statusCode = 500;
    } else {
      statusCode = 502; // External API failure (Gemini)
    }

    res.status(statusCode).json({
      error: "Failed to process image or analyze with Gemini.",
      details: error.message,
    });
  }
});

export default router;
