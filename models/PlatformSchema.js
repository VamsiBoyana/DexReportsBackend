// models/Platform.js
const mongoose = require("mongoose");

const platformSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true },
    networkId: { type: mongoose.Schema.Types.ObjectId, ref: "Network", required: true },
    networkName: { type: String, default: "" },
    status: { type: Boolean, default: false }, // true for active and false for inactive
  },
  { timestamps: true }
);

module.exports = mongoose.model("Platform", platformSchema);
