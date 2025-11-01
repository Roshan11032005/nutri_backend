// testClient.js

import fs from "fs";
import axios from "axios";
import "dotenv/config"; // To load variables like API_URL if defined

// --- CONFIGURATION ---
// 🚨 IMPORTANT: Change this to the exact path and filename of your test image 🚨
const IMAGE_PATH =
  "/home/roshan/Downloads/chorizo-mozarella-gnocchi-bake-cropped-9ab73a3.jpg";

// ✅ UPDATED: Use the actual MongoDB ObjectId for the user
const USER_ID = "68ebbbcc13d619a724e75bfa";

// ✅ NEW REQUIRED FIELD: Must be one of ["breakfast", "lunch", "dinner", "snack"]
const MEAL_TYPE = "dinner";

const API_ENDPOINT = "http://localhost:8089/api/track/image";

// Helper function to determine MIME type (simplified)
function getMimeType(filePath) {
  const extension = filePath.split(".").pop().toLowerCase();
  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "jpeg":
    case "jpg":
    default:
      return "image/jpeg";
  }
}

async function runTest() {
  console.log(`--- Starting API Test for ${IMAGE_PATH} ---`); // 1. Read the image file into a Buffer

  if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`\n❌ Error: File not found at path: ${IMAGE_PATH}`);
    console.error("Please update the IMAGE_PATH variable in testClient.js.");
    return;
  }

  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  const mimeType = getMimeType(IMAGE_PATH); // 2. Convert Buffer to Base64 string

  const base64Image = imageBuffer.toString("base64"); // 3. Construct the final data URL format

  const base64DataURL = `data:${mimeType};base64,${base64Image}`; // ✅ UPDATED PAYLOAD: Includes user_id (as _id) and mealType

  const payload = {
    user_id: USER_ID,
    mealType: MEAL_TYPE,
    image_base64: base64DataURL,
  };

  console.log(
    `✅ Image loaded. Size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB. Sending request to ${API_ENDPOINT}...`,
  );
  console.log(`   (Test User: ${USER_ID}, Meal Type: ${MEAL_TYPE})`);

  try {
    // 4. Send the POST request
    const response = await axios.post(API_ENDPOINT, payload, {
      // Important: Set a high timeout for the Gemini response
      timeout: 60000,
    }); // 5. Handle success response

    console.log("\n--- API Response (Success) ---");
    console.log("Status:", response.status);
    console.log(JSON.stringify(response.data, null, 2));
    console.log("------------------------------");
  } catch (error) {
    // 6. Handle error response
    console.log("\n--- API Response (Error) ---");
    if (error.response) {
      // Server responded with an error status (e.g., 400, 500)
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else if (error.request) {
      // Request was sent but no response received (e.g., timeout, server down)
      console.error("No response received from server.");
    } else {
      // Something else happened in setting up the request
      console.error("Request setup error:", error.message);
    }
    console.log("----------------------------");
  }
}

runTest();
