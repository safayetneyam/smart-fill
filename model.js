const { GoogleGenerativeAI } = require("@google/generative-ai");
const { commonTags } = require("./data");
const Groq = require("groq-sdk");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const client = new Groq({
  apiKey: process.env["GROQ_API_KEY"], // This is the default and can be omitted
});

function extractJSON(text) {
  try {
    // Extract the JSON content using regex
    // const match = text.match(/```\n([\s\S]*?)\n```/);
    // if (match && match[1]) {
    //   // Parse and return the JSON object
    //   return JSON.parse(match[1]);
    // } else {
    //   throw new Error("No JSON found in the text");
    // }
    const jsonMatch = text.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in the input text.");
    }

    return JSON.parse(jsonMatch);
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
                      "firstname" : "",
                      "lastname" : "",
                      "dateOfBirth" : ""
                    }
  
                    Here is some of the common information tag. Try to fill them with priority if possible and keep the tag name as it is. Add extra information with new label if needed.
                    ${commonTags}
                    if any information is missing use N/A for them. Extract as many information possible and properly lable them in json format.
  
                    Instructions:
                    1. Don't add unncessary information or text before or after the output.
                    2. Don't imagine any data. Just extract from given input text.
                    3. Provide only the json as output.
                    4. Format text for better spacing and identation. Process gaps wisely for name, address, date of birth etc.
  
             
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

module.exports = {
  fetchInfo,
};
