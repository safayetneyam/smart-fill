const { InfoModel } = require("./schema");

const addInfo = async (information) => {
  const info = await InfoModel.find();

  if (info.length === 0) {
    await InfoModel.create(information);
  } else {
    const existingData = JSON.parse(info[0].info); // Get the first document
    const newData = JSON.parse(information.info); // Parse the incoming JSON string

    // Merge data based on rules
    for (const key in newData) {
      if (!existingData[key]) {
        // Rule 4: If key doesn't exist in previous doc, add it
        // console.log("Adding new key:", key);
        existingData[key] = newData[key];
      } else if (existingData[key] === "N/A" && newData[key] !== "N/A") {
        // Rule 3: If previous value is "N/A" but new value is proper, replace it
        // console.log("Replacing N/A with new value for key:", key);
        existingData[key] = newData[key];
      } else if (newData[key] === "N/A") {
        // Rule 2: If new value is "N/A", do not replace
        // console.log("New value is N/A, keeping old value for key:", key);
        continue;
      }
      // Rule 1: If previous value is proper and new value is also proper, keep the old value
    }

    // Update document with merged data

    // console.log("Changed data: ", existingData);
    await InfoModel.findByIdAndUpdate(info[0]._id, {
      info: JSON.stringify(existingData),
    });
    await InfoModel.findByIdand;
  }
};

const getInfo = async () => {
  return await InfoModel.find();
};

module.exports = {
  addInfo,
  getInfo,
};
