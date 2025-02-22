const Groq = require("groq-sdk");
require("dotenv").config();

const client = new Groq({
  apiKey: process.env["GROQ_API_KEY"], // This is the default and can be omitted
});

const retriveData = async (data, query) => {
  const params = {
    messages: [
      {
        role: "system",
        content: `You are a helpful AI assistant who can extract meaningful data from given text.
            You will be given a text of json data that contains personal details information. Extract only the information best suited for the query.
            For example if you are asked
            "Extract the name of the person please"
            add firstname and lastname and return as a single name. 
            If the information is not available, return N/A.

            Instruction: 
            1. Don't add any extra information or text before or after the output.
            2. Don't imagine any data. Just extract from given input text.
            3. Provide only the extracted data.
            4. If name is asked, give full name.
            5. Format text for better spacing and identation. Process gaps wisely for name, address, date of birth etc.

            here is the given data 
            <DATA START>
            ${data}
            </DATA END>

            Just give the value. Don't add any text before of after.

            Note:
            issuer = issuing authority
        `,
      },
      {
        role: "user",
        content: `Extract the ${query} of the person from the given data please. Extract only if available in given data. Don't calculate or create any information. If you don't find simply say not found.`,
      },
    ],
    model: "llama3-8b-8192",
  };
  const chatCompletion = await client.chat.completions.create(params);
  //   console.log(chatCompletion.choices[0].message.content);
  return chatCompletion.choices[0].message.content;
};

module.exports = {
  retriveData,
};
