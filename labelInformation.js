const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load environment variables
require("dotenv").config();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Load JSON file safely.
 */
const loadJSON = (filePath) => {
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    return null;
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
    return null;
  }
};

/**
 * Send labels.json & info.json to Gemini AI for processing
 */
const generateLabeledTextWithAI = async (labels, info) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
    You are given two JSON objects:

    1. **Labels JSON**: Contains a list of labels that need to be mapped to values.
    2. **Info JSON**: Contains extracted information.

    Your task:
    - Match each label from Labels JSON with the best possible value from Info JSON.
    - Give full information. Example: place of birth should be full, not short!
    - If a label does not have a corresponding value, return "N/A".
    - Format the result as follows:
      
      Label Name: Information

    **Example Output:**
    Name: John Doe
    Date of Birth: 12/11/2002
    Address: 123 Main Street
    Job Title: Software Engineer

    Here are the JSON files:

    **Labels JSON:**
    ${JSON.stringify(labels, null, 2)}

    **Info JSON:**
    ${JSON.stringify(info, null, 2)}

    Return only the formatted text output.
    `;

    const result = await model.generateContent([{ text: prompt }]);
    return result.response.text().trim();
  } catch (error) {
    console.error(`❌ Gemini API Error:`, error.message);
    return null;
  }
};

/**
 * Save the labeled information to a text file
 */
const saveLabeledText = (text) => {
  const outputFilePath = path.join(__dirname, "labeledInformation.txt");
  fs.writeFileSync(outputFilePath, text, "utf8");
  console.log(`✅ Labeled information saved to ${outputFilePath}`);
};

/**
 * Main function to process and generate labeled text
 */
const processLabelInformation = async () => {
  console.log("🔍 Processing labels with AI-based matching...");

  const labels = loadJSON("labels.json");
  const infoData = loadJSON("info.json");

  if (!labels || !infoData) {
    console.error("⚠️ labels.json or info.json is missing or empty.");
    return;
  }

  const labeledText = await generateLabeledTextWithAI(labels, infoData);

  if (labeledText) {
    saveLabeledText(labeledText);
  } else {
    console.error("❌ Failed to generate labeled text.");
  }
};

module.exports = { processLabelInformation };
