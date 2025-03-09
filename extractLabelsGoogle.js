const fs = require("fs");
const path = require("path");
const pdfLib = require("pdf-lib");
const mammoth = require("mammoth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Delay function for better API request handling.
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Split a PDF into smaller chunks (default: 1 pages per file).
 */
const splitPDF = async (pdfPath, chunkSize = 1) => {
  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await pdfLib.PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    console.log(
      `Splitting PDF: ${totalPages} pages → Processing in chunks of ${chunkSize}...`
    );

    let chunks = [];
    for (let i = 0; i < totalPages; i += chunkSize) {
      const newPdf = await pdfLib.PDFDocument.create();
      const copiedPages = await newPdf.copyPages(
        pdfDoc,
        Array.from({ length: chunkSize }, (_, idx) => i + idx).filter(
          (idx) => idx < totalPages
        )
      );

      copiedPages.forEach((page) => newPdf.addPage(page));
      const chunkBytes = await newPdf.save();

      const chunkPath = `${pdfPath}_part_${Math.ceil((i + 1) / chunkSize)}.pdf`;
      fs.writeFileSync(chunkPath, chunkBytes);
      chunks.push(chunkPath);
    }
    return chunks;
  } catch (error) {
    console.error("❌ Error splitting PDF:", error.message);
    return [];
  }
};

/**
 * Send a PDF chunk to Google Gemini for label extraction.
 */
const extractLabelsFromPDFChunk = async (pdfPath) => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    console.log(`📤 Uploading ${path.basename(pdfPath)} to Google Gemini...`);
    const result = await model.generateContent([
      {
        inlineData: {
          data: dataBuffer.toString("base64"),
          mimeType: "application/pdf",
        },
      },
      {
        text: `Analyze the following text and extract **all form labels** including **checklist items**.
               - Maintain **hierarchical structure** (e.g., "Family Member 1 Given Names" under "Family Member 1").
               - Detect **checklist options**, ** supporting documents** and format them as **part of the main label**.
               - Detect **supporting documents** and format them as **part of the main label**.
               - Remove **newline characters (\n)** and replace them with a **space**.
               - If a checklist or gaps is under a label, write label name - checklist or gap name.
               - Do not skip any labels. Keep as many labels as possible. 

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
                 "Issuing Authority/ Place of Issue as Shown in Passport",
                 "Parent 2 - Relationship to you",
                 "Parent 2 - Date of Birth"
               ]
                 
               Do **not** group items inside nested JSON objects.
               Return only a **flat JSON list of labels**.`,
      },
    ]);

    let responseText = result.response.text().trim();
    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/```json|```/g, "").trim();
    }

    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error(
        "❌ Error parsing JSON response from Gemini:",
        error.message
      );
      return []; // Return an empty array instead of crashing
    }
  } catch (error) {
    console.error(`❌ Error extracting labels from ${pdfPath}:`, error.message);
    return [];
  }
};

/**
 * Process a PDF by splitting it, processing each chunk separately, and merging labels at the end.
 */
const extractTextFromPDF = async (pdfPath) => {
  try {
    const chunks = await splitPDF(pdfPath, 2);
    let allLabels = [];

    for (const chunk of chunks) {
      const labels = await extractLabelsFromPDFChunk(chunk);
      allLabels.push(...labels);
      fs.unlinkSync(chunk); // Delete chunk after processing
      await delay(30000); // 30-second delay before processing the next chunk
    }

    return allLabels.length > 0 ? allLabels : [];
  } catch (error) {
    console.error("❌ Error processing PDF:", error.message);
    return [];
  }
};

/**
 * Save extracted labels to `labels.json` safely.
 */
const saveLabelsToFile = (labels) => {
  try {
    const filePath = "labels.json";
    let existingLabels = [];

    // Check if labels.json exists and is not empty before reading
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
      try {
        const existingData = fs.readFileSync(filePath, "utf8");
        existingLabels = JSON.parse(existingData);
      } catch (error) {
        console.error(
          "⚠️ Warning: labels.json is corrupted. Resetting file..."
        );
        existingLabels = []; // Reset corrupted file
      }
    }

    const combinedLabels = [...existingLabels, ...labels];
    fs.writeFileSync(filePath, JSON.stringify(combinedLabels, null, 2));
    console.log("✅ Labels saved in labels.json");
  } catch (error) {
    console.error("❌ Error saving labels to file:", error.message);
  }
};

/**
 * Process the file and extract structured labels & checklist items.
 */
const processFileWithGemini = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  let extractedLabels = [];

  switch (ext) {
    case ".pdf":
      extractedLabels = await extractTextFromPDF(filePath);
      break;
    default:
      console.log(`⚠️ Unsupported File Type: ${filePath}`);
      return;
  }

  if (extractedLabels.length > 0) {
    saveLabelsToFile(extractedLabels);
  } else {
    console.log("⚠️ No labels found.");
  }
};

module.exports = {
  processFileWithGemini,
};
