const { GoogleGenerativeAI } = require("@google/generative-ai");
const { commonTags } = require("./data");
const Groq = require("groq-sdk");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const client = new Groq({
  apiKey: process.env["GROQ_API_KEY"], // This is the default and can be omitted
});

// function extractJSON(text) {
//   try {
//     // Extract the JSON content using regex
//     // const match = text.match(/```\n([\s\S]*?)\n```/);
//     // if (match && match[1]) {
//     //   // Parse and return the JSON object
//     //   return JSON.parse(match[1]);
//     // } else {
//     //   throw new Error("No JSON found in the text");
//     // }
//     const jsonMatch = text.match(/{[\s\S]*}/);
//     if (!jsonMatch) {
//       throw new Error("No valid JSON found in the input text.");
//     }

//     return JSON.parse(jsonMatch);
//   } catch (error) {
//     console.error("Error parsing JSON:", error);
//     return null;
//   }
// }

// --------------------------------
// --------------------------------
// --------------------------------
// --------------------------------
// new code of extractJSON
// --------------------------------
// --------------------------------
// --------------------------------

function extractJSON(text) {
  try {
    const jsonMatch = text.match(/{[\s\S]*}/);
    if (!jsonMatch) throw new Error("No valid JSON found in the input text.");

    let jsonString = jsonMatch[0];

    // Ensure N/A is properly formatted as a string
    jsonString = jsonString.replace(/:\s*N\/A/g, ': "N/A"');

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null;
  }
}

const fetchInfo = async (input) => {
  //   console.log(commonTags);
  const prompt = `You are an AI assistant who can extract information from given text and label them.
                    Here is some information given in text format extracted from some source like Identity Card, Resume, Google scholar or any other social profile.
                    You task is to label them properly and return a json file.
  
                    Example of json format is
                    {
                      "name" : "",
                      "dateOfBirth" : ""
                    }

                    Points:
                    1. Here is some of the common information tag.  ${commonTags} Try to fill them with priority if possible and keep the tag name as it is.
                    2. If any information is missing use N/A for those label names. 
                    3. Even if there is no labelled information, extract ALL the information possible and properly label them in json format.
  
                    Instructions:
                    1. Don't add unncessary information or text before or after the output.
                    2. Don't imagine any data. Just extract from given input text.
                    3. Provide only the json as output.
                    4. Format text for better spacing and identation. Process gaps wisely for name, address, date of birth etc.
  
                    Note:
                    1. For Birth Certificate, Please read register no, Date of Registration and Date of Issue.
                    `;

  // const result = await model.generateContent(prompt);

  const params = {
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: `       Input text is given below:
                    <INPUT_START>
                    ${input}
                    </INPUT_END>`,
      },
    ],
    model: "llama3-8b-8192",
  };
  const chatCompletion = await client.chat.completions.create(params);
  // console.log(chatCompletion.choices[0].message.content);
  return extractJSON(chatCompletion.choices[0].message.content);
  // console.log(result.response.text());
  // return extractJSON(result.response.text());
};

// Function to extract labels
const labelExtraction = async (text) => {
  const prompt = `You are an AI assistant that extracts form labels from the given text.
                  A form label is the text before an input field like "Name:", "Date of Birth:", "Email:", Questions etc.
                  Do NOT include extra phrases like "Here is the list of form labels".
                  Only extract the labels as a pure list, without any introductory text, explanations, numbering, or formatting.
                  Each label must be on a new line. Do not return empty lines or unnecessary words.

                  Example:
                  Input:
                  "Name: John Doe
                  Date of Birth: 12/11/2002
                  Phone: 123456789"
                  
                  Output:
                  Name
                  Date of Birth
                  Phone

                  Extract only the labels from the following text:
                  ${text}`;

  const params = {
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: `Extract only form labels from the given text.`,
      },
    ],
    model: "llama3-8b-8192",
  };

  const chatCompletion = await client.chat.completions.create(params);

  // Ensure labels are returned as a clean, trimmed list
  return chatCompletion.choices[0].message.content
    .split("\n") // Split by new lines
    .map((label) => label.trim()) // Trim spaces
    .filter((label) => label && label.length > 2); // Remove empty or short lines
};

module.exports = {
  fetchInfo,
  labelExtraction,
};
