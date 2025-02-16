const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const { fetchInfo } = require("./model");
const { addInfo } = require("./database");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI with the updated model
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Function to process text files
async function processTextFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    const generatedOutput = await fetchInfo(data);
    addInfo({ info: JSON.stringify(generatedOutput) });
  } catch (error) {
    console.error("Error reading text file:", error);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to process PDF files
const pdfFetch = async (pdfUrl) => {
  try {
    const dataBuffer = fs.readFileSync(pdfUrl);
    const data = await pdf(dataBuffer);
    const generatedOutput = await fetchInfo(data.text);
    addInfo({ info: JSON.stringify(generatedOutput) });
    return generatedOutput;
  } catch (error) {
    console.error("Error reading PDF:", error);
  }
};

// Function to process images using Gemini 1.5 Flash
const imageOCR = async (imageUrl) => {
  try {
    const dataBuffer = fs.readFileSync(imageUrl);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: dataBuffer.toString("base64"),
          mimeType: "image/png",
        },
      },
      {
        text: "Extract all readable text from this image. Return only the extracted text, nothing else.",
      },
    ]);

    const text = result.response.text();
    // console.log("Extracted Text from Image:\n", text);

    const generatedOutput = await fetchInfo(text);
    addInfo({ info: JSON.stringify(generatedOutput) });
  } catch (error) {
    console.error("Error reading image with Gemini:", error.message);
  }
};

// Function to process DOCX files
const docFetch = async (docUrl) => {
  try {
    const dataBuffer = fs.readFileSync(docUrl);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    const generatedOutput = await fetchInfo(result.value);
    addInfo({ info: JSON.stringify(generatedOutput) });
    return generatedOutput;
  } catch (error) {
    console.error("Error reading Doc:", error);
  }
};

// Function to determine file type and call the appropriate processor
async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  switch (ext) {
    case ".png":
    case ".jpg":
    case ".jpeg":
      await imageOCR(filePath);
      break;
    case ".pdf":
      await pdfFetch(filePath);
      break;
    case ".docx":
      await docFetch(filePath);
      break;
    case ".txt":
      await processTextFile(filePath);
      break;
    default:
      console.log(`⚠️ Unsupported File Type: ${filePath}`);
  }
}

// Function to read all files from a folder and process them
async function readFilesFromFolder(folderPath) {
  try {
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      if (fs.lstatSync(filePath).isFile()) {
        console.log(`📁 Processing File: ${file}`);
        await processFile(filePath);
        console.log("✔️ Processed: " + file + "\n");

        if (file !== files[files.length - 1]) {
          console.log("🔄 Checking next file...");
          await sleep(10000);
        }
        if (file === files[files.length - 1])
          console.log("✅ All files processed");
      }
    }
  } catch (error) {
    console.error("Error reading folder:", error);
  }
}

module.exports = {
  readFilesFromFolder,
};
