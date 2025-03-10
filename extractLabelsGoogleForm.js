const fs = require("fs");
const puppeteer = require("puppeteer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load API key
require("dotenv").config();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Extracts form labels and questions from Google Form using Puppeteer.
 * @param {string} formUrl - Google Form URL
 */
const extractLabelsFromGoogleForm = async (formUrl) => {
  try {
    console.log("🔍 Launching browser to fetch Google Form...");

    // Launch Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to Google Form
    await page.goto(formUrl, { waitUntil: "networkidle2" });

    console.log("✅ Successfully loaded Google Form.");

    // Extract all possible labels (including questions, section headers, and options)
    const rawLabels = await page.evaluate(() => {
      const extractedLabels = [];
      document.querySelectorAll(".Qr7Oae, .M7eMe").forEach((el) => {
        extractedLabels.push(el.innerText.trim());
      });
      return extractedLabels.filter((text) => text.length > 2); // Remove empty labels
    });

    await browser.close();

    if (rawLabels.length === 0) {
      console.log(
        "⚠️ No labels found. The form might be private or protected."
      );
      return;
    }

    // Process labels with AI to classify and structure them
    const structuredLabels = await classifyLabelsWithAI(rawLabels);

    // Save structured labels to labels.json
    fs.writeFileSync("labels.json", JSON.stringify(structuredLabels, null, 2));
    console.log("✅ Labels extracted and saved to labels.json");

    return structuredLabels;
  } catch (error) {
    console.error("❌ Error extracting from Google Form:", error.message);
  }
};

/**
 * Uses AI to classify and structure extracted labels.
 * @param {Array} labels - Extracted raw labels
 */
const classifyLabelsWithAI = async (labels) => {
  try {
    console.log("🤖 Sending labels to AI for classification...");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
      You are an AI assistant that classifies and structures form labels extracted from a Google Form.

      **Task:**
      - Analyze the provided labels.
      - Classify them into categories:
        1️⃣ **Questions** (e.g., "What is your name?")
        2️⃣ **Section Labels** (e.g., "Personal Information", "Work Experience")
        3️⃣ **Checkbox Options** (e.g., "Yes", "No", "Prefer not to say")

      **Formatting Guidelines:**
      - Maintain a **flat JSON array**.
      - Add prefixes for sections:
        Example: "Personal Information - Full Name"
      - Ensure **checkbox options** are formatted correctly:
        Example:
        [
          "Do you have work experience? - Yes",
          "Do you have work experience? - No"
        ]
      - **Do not modify original labels**, only classify them properly.

      **Example Output (JSON Format):**
      [
        "Personal Information - Full Name",
        "Personal Information - Date of Birth",
        "Education - Highest Qualification",
        "Do you have work experience? - Yes",
        "Do you have work experience? - No",
        "Preferred Job Location - Remote"
      ]

      **Now, classify the following labels:**
      ${JSON.stringify(labels, null, 2)}
    `;

    // Send labels to AI for classification
    const result = await model.generateContent([{ text: prompt }]);
    let responseText = result.response.text().trim();

    // Ensure proper JSON format
    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/```json|```/g, "").trim();
    }

    let structuredLabels = [];
    try {
      structuredLabels = JSON.parse(responseText);
    } catch (error) {
      console.error("❌ Error parsing JSON response from AI:", error.message);
    }

    return structuredLabels;
  } catch (error) {
    console.error("❌ Error processing labels with AI:", error.message);
    return labels; // Return raw labels if AI fails
  }
};

module.exports = {
  extractLabelsFromGoogleForm,
};
