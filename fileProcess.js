const fs = require("fs");
const path = require("path");
const { createWorker } = require("tesseract.js");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const { fetchInfo } = require("./model");
const { addInfo } = require("./database");

// Function to process text files
async function processTextFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    console.log(`📄 Text File: ${filePath}\nContent:\n${data}\n`);

    // Call the fetchInfo function to extract information
    const generatedOutput = await fetchInfo(data);
    // console.log(generatedOutput);
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
  // const filename = path.basename(pdfUrl);
  // console.log("[PDF]: Fetching " + filename + "...");
  try {
    // Read the PDF file
    const dataBuffer = fs.readFileSync(pdfUrl);
    // Parse the PDF content
    const data = await pdf(dataBuffer);
    // Output the extracted text
    // console.log("PDF Extracted Text:\n", data.text);
    const generatedOutput = await fetchInfo(data.text);
    // console.log(generatedOutput);
    addInfo({ info: JSON.stringify(generatedOutput) });
    return generatedOutput;
  } catch (error) {
    console.error("Error reading PDF:", error);
  }
};

const imageOCR = async (imageUrl) => {
  // const filename = path.basename(imageUrl);
  // console.log("[IMAGE]: Fetching " + filename + "...");
  try {
    const dataBuffer = fs.readFileSync(imageUrl);

    const worker = await createWorker("eng");
    const ret = await worker.recognize(dataBuffer);
    // console.log(ret.data.text);

    const generatedOutput = await fetchInfo(ret.data.text);
    // console.log(generatedOutput);
    addInfo({ info: JSON.stringify(generatedOutput) });
    await worker.terminate();
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const docFetch = async (docUrl) => {
  // const filename = path.basename(docUrl);
  // console.log("[DOC]: Fetching " + filename + "...");
  try {
    const dataBuffer = fs.readFileSync(docUrl);
    // Convert the DOC content to plain text
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    // Print the extracted text
    // console.log("DOCS Extracted Text:\n", result.value);
    const generatedOutput = await fetchInfo(result.value);
    // console.log(generatedOutput);
    addInfo({ info: JSON.stringify(generatedOutput) });
    return generatedOutput;
    // res.json(generatedOutput);
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
      await imageOCR(filePath);
      break;
    case ".jpg":
      await imageOCR(filePath);
      break;
    case ".jpeg":
      await imageOCR(filePath);
      break;
    case ".pdf":
      await pdfFetch(filePath);
      break;
    case ".docx":
      await docFetch(filePath);
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
        const filename = path.basename(filePath);
        console.log(`📁 Processing File: ${filename}`);
        await processFile(filePath);

        console.log("✔️ Processed: " + filename + "\n");

        if (file !== files[files.length - 1]) {
          console.log("🔄 Checking next file...");
          await sleep(30000);
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
