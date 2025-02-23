const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const { labelExtraction } = require("./model");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI for image OCR
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Function to extract labels from an image using Gemini 1.5
const extractLabelsFromImage = async (imagePath) => {
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
        text: "Extract all form labels from this image. Only return the labels.",
      },
    ]);

    return result.response.text();
  } catch (error) {
    console.error("Error extracting labels from image:", error.message);
  }
};

// Function to extract labels from PDF
const extractLabelsFromPDF = async (pdfPath) => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting labels from PDF:", error);
  }
};

// Function to extract labels from DOCX
const extractLabelsFromDOCX = async (docxPath) => {
  try {
    const dataBuffer = fs.readFileSync(docxPath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting labels from DOCX:", error);
  }
};

// Function to extract labels from text file
const extractLabelsFromText = async (textPath) => {
  try {
    return fs.readFileSync(textPath, "utf8");
  } catch (error) {
    console.error("Error extracting labels from text file:", error);
  }
};

// Function to determine file type and extract labels
const extractLabelsFromFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  let extractedText = "";

  switch (ext) {
    case ".png":
    case ".jpg":
    case ".jpeg":
      extractedText = await extractLabelsFromImage(filePath);
      break;
    case ".pdf":
      extractedText = await extractLabelsFromPDF(filePath);
      break;
    case ".docx":
      extractedText = await extractLabelsFromDOCX(filePath);
      break;
    case ".txt":
      extractedText = await extractLabelsFromText(filePath);
      break;
    default:
      console.log(`⚠️ Unsupported File Type: ${filePath}`);
      return;
  }

  const labels = await labelExtraction(extractedText);

  fs.writeFileSync("labels.json", JSON.stringify(labels, null, 2));
  console.log("✅ Labels saved in labels.json");
};

module.exports = {
  extractLabelsFromFile,
};

// C:\Users\User\Downloads\Form/form01.jpg
