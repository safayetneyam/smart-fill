const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Extract text from an image using Google Gemini (OCR)
 */
const extractTextFromImage = async (imagePath) => {
  try {
    const dataBuffer = fs.readFileSync(imagePath);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: dataBuffer.toString("base64"),
          mimeType: "image/png",
        },
      },
      {
        text: "Extract all readable text from this image.",
      },
    ]);

    return result.response.text().trim();
  } catch (error) {
    console.error("Error extracting text from image:", error.message);
    return "";
  }
};

/**
 * Extract text from PDF
 */
const extractTextFromPDF = async (pdfPath) => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    return data.text.trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error.message);
    return "";
  }
};

/**
 * Extract text from DOCX
 */
const extractTextFromDOCX = async (docxPath) => {
  try {
    const dataBuffer = fs.readFileSync(docxPath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return result.value.trim();
  } catch (error) {
    console.error("Error extracting text from DOCX:", error.message);
    return "";
  }
};

/**
 * Extract text from TXT file
 */
const extractTextFromTXT = async (txtPath) => {
  try {
    return fs.readFileSync(txtPath, "utf8").trim();
  } catch (error) {
    console.error("Error extracting text from TXT:", error.message);
    return "";
  }
};

/**
 * Extract structured labels & checklist options using Google Gemini
 */
const extractStructuredLabels = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent([
      {
        text: `Analyze the following text and extract **all form labels** including **checklist items**.
               - Maintain **hierarchical structure** (e.g., "Family Member 1 Given Names" under "Family Member 1").
               - Detect **checklist options** and format them as **part of the main label**.
               - Remove **newline characters (\n)** and replace them with a **space**.
               - Don't loose / remove necessary information.

               Example Output (JSON format):
               [
                 "Identity Document Checklist - Australian Driver’s Licence",
                 "Identity Document Checklist - Passport",
                 "Identity Document Checklist - UNHCR Document",
                 "Identity Document Checklist - National Identity Card",
                 "Identity Document Checklist - Other Document with Signature and Photo",
                 "Supporting Document - Your Australian citizen parent’s",
                 "Family Member 1 Relationship to You",
                 "Family Member 1 Full Name",
                 "Family Member 1 Given Names",
                 "Family Member 1 Name in Chinese Commercial Code Numbers (if applicable)",
                 "Family Member 1 Place of Birth Town/City",
                 "Family Member 1 Place of Birth State/Province",
                 "Family Member 1 Place of Birth Country",
                 "Issuing Authority/ Place of Issue as Shown in Passport"
               ]

               Do **not** group items inside nested JSON objects.
               Return only a **flat JSON list of labels**.
               Text Input:
               """
               ${text.replace(/\n/g, " ")}
               """`,
      },
    ]);

    let responseText = result.response.text().trim();

    // 🔹 Clean JSON formatting (remove triple backticks)
    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/```json|```/g, "").trim();
    }

    // 🔹 Parse JSON
    const labels = JSON.parse(responseText);
    return Array.isArray(labels) ? labels : [];
  } catch (error) {
    console.error("Error extracting labels:", error.message);
    return [];
  }
};

/**
 * Process the file and extract **hierarchical labels & checklist items**
 */
const processFileWithGemini = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  let extractedText = "";

  switch (ext) {
    case ".png":
    case ".jpg":
    case ".jpeg":
      extractedText = await extractTextFromImage(filePath);
      break;
    case ".pdf":
      extractedText = await extractTextFromPDF(filePath);
      break;
    case ".doc":
    case ".docx":
      extractedText = await extractTextFromDOCX(filePath);
      break;
    case ".txt":
      extractedText = await extractTextFromTXT(filePath);
      break;
    default:
      console.log(`⚠️ Unsupported File Type: ${filePath}`);
      return;
  }

  if (!extractedText.trim()) {
    console.log("⚠️ No text extracted from file.");
    return;
  }

  const structuredLabels = await extractStructuredLabels(extractedText);

  if (structuredLabels.length > 0) {
    fs.writeFileSync("labels.json", JSON.stringify(structuredLabels, null, 2));
    console.log("✅ Labels extracted and saved to labels.json");
  } else {
    console.log("⚠️ No labels found.");
  }
};

module.exports = {
  processFileWithGemini,
};
