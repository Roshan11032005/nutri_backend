import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    nutritionistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    appointmentDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
    notes: String,
  },
  { timestamps: true },
);

export default mongoose.model("Appointment", appointmentSchema);
