import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nutritionistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, enum: ["foodPhoto", "other"], default: "other" },
    data: { type: String, required: true }, // Base64 string
  },
  { timestamps: true },
);

export default mongoose.model("Media", mediaSchema);
