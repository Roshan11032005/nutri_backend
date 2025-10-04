import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  startDate: Date,
  endDate: Date,
  active: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["nutritionist", "user"], required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    height: Number, // cm
    weight: Number, // kg
    healthConditions: [String],
    subscription: subscriptionSchema,
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
