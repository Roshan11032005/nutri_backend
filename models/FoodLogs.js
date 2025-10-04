import mongoose from "mongoose";

const foodLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    foodId: { type: mongoose.Schema.Types.ObjectId, ref: "Food" },
    quantity: Number, // grams or ml
    calories: Number,
    date: { type: Date, default: Date.now },
    mealType: { type: String, enum: ["breakfast", "lunch", "dinner", "snack"] },
  },
  { timestamps: true },
);

export default mongoose.model("FoodLog", foodLogSchema);
