const fs = require("fs");
const axios = require("axios");
const { labelExtraction } = require("./model");

const extractTextFromGoogleDocs = async (docUrl) => {
  try {
    console.log("🔍 Fetching content from Google Docs...");

    // Extract the Document ID from the URL
    const docIdMatch = docUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch) {
      console.error(
        "❌ Invalid Google Docs URL. Please enter a valid public link."
      );
      return;
    }
    const docId = docIdMatch[1];

    // Construct Google Docs export as text URL
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    // Fetch the document content
    const response = await axios.get(exportUrl);
    const extractedText = response.data;

    const labels = await labelExtraction(extractedText);

    fs.writeFileSync("labels.json", JSON.stringify(labels, null, 2));
    console.log("✅ Labels extracted and saved to labels.json");

    return labels;
  } catch (error) {
    console.error("❌ Error extracting from Google Docs:", error.message);
  }
};

module.exports = {
  extractTextFromGoogleDocs,
};
