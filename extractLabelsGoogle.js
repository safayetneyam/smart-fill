const fs = require("fs");
const path = require("path");
const pdfLib = require("pdf-lib");
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
 * Introduce delay between processing
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Split a PDF into smaller chunks (default: 3 pages per file)
 */
const splitPDF = async (pdfPath, chunkSize = 3) => {
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
    console.error("Error splitting PDF:", error.message);
    return [];
  }
};

/**
 * Extract labels from a single PDF chunk
 */
const extractLabelsFromPDFChunk = async (pdfPath) => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    console.log(`Uploading ${path.basename(pdfPath)} to Google Gemini...`);
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
               - Remove **newline characters (\n)** and replace them with a **space**.
               - Do not reduce the labels. Keep it as it is. 

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
               Return only a **flat JSON list of labels**.`,
      },
    ]);

    let responseText = result.response.text().trim();
    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/```json|```/g, "").trim();
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error(`Error extracting labels from ${pdfPath}:`, error.message);
    return [];
  }
};

/**
 * Process a PDF by splitting it, processing each chunk separately, and merging labels at the end
 */
const extractTextFromPDF = async (pdfPath) => {
  try {
    const chunks = await splitPDF(pdfPath, 3);
    let allLabels = [];

    for (const chunk of chunks) {
      const labels = await extractLabelsFromPDFChunk(chunk);
      allLabels.push(...labels);
      fs.unlinkSync(chunk);
      await delay(30000); // 30-second delay before processing the next chunk
    }

    return allLabels.length > 0 ? allLabels : [];
  } catch (error) {
    console.error("Error processing large PDF:", error.message);
    return [];
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

    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/```json|```/g, "").trim();
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error extracting labels:", error.message);
    return [];
  }
};

module.exports = {
  processFileWithGemini: extractTextFromPDF,
};
