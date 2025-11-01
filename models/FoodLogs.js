import mongoose from "mongoose";

const foodLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      default: null,
    }, // 💡 MODIFIED: Set to optional/default null
    // Fields from Gemini Analysis:
    food_item_name: { type: String }, // To store the 'food_item' string from Gemini
    quantity: { type: Number, required: true }, // grams (from estimated_serving_size_g)
    calories: { type: Number, required: true },
    protein_g: { type: Number }, // New: Estimated protein from Gemini
    fat_g: { type: Number }, // New: Estimated fat from Gemini
    carbs_g: { type: Number }, // New: Estimated carbs from Gemini

    date: { type: Date, default: Date.now },
    mealType: { type: String, enum: ["breakfast", "lunch", "dinner", "snack"] }, // Still required, must be set by the client
  },
  { timestamps: true },
); // 🛑 REMOVE THE EXTRA '()' HERE

export const FoodLogModel = mongoose.model("FoodLog", foodLogSchema);
