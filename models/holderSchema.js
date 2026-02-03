// models/HoldersModel.js
const mongoose = require("mongoose");

const HolderSchema = new mongoose.Schema({
  rank: Number,
  owner: String,
  address: String,
  percentage: Number,
  value: Number,
  tokenName: String,
  tokensymbol: String,
  tokenAddress: String,
  date: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Holders", HolderSchema);
