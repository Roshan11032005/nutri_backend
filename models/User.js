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
    mobileNumber: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    height: Number,
    weight: Number,
    healthConditions: [String],
    subscription: subscriptionSchema,
  },
  {
    timestamps: true,
    // 🛑 CRITICAL FIX: Disable command buffering 🛑
    // This tells Mongoose: If the database is not ready, fail instantly.
    // This often resolves race conditions where the database appears connected but isn't ready for queries.
    bufferCommands: false,
  },
);

export default mongoose.model("User", userSchema);
