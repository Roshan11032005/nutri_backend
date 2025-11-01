import mongoose from "mongoose";

const nutrientsSchema = new mongoose.Schema({
  calories: Number,
  protein: Number,
  fat: Number,
  carbs: Number,
});

const foodSchema = new mongoose.Schema(
  {
    edamamId: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    nutrients: nutrientsSchema,
    servingSize: String,
  },
  { timestamps: true },
);

export const FoodModel = mongoose.model("Food", foodSchema);
