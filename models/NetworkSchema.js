// models/Network.js
const mongoose = require("mongoose");

const networkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    status: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Network", networkSchema);
