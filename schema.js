const { Schema, model } = require("mongoose");

const InfoSchema = new Schema({
  info: { type: String, required: true, trim: true },
});
const InfoModel = model("Info", InfoSchema);

module.exports = { InfoModel };
