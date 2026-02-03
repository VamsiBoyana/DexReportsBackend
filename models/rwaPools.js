const mongoose = require("mongoose");

const liquidityPoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: false }, // No uniqueness constraint here
    tokenAddress: { type: String, required: true },
    pairAddress: { type: String, unique: true, required: true }, // Keep this unique
    logoURI: { type: String, required: false },
    symbol: { type: String, required: false },
    address: { type: String, required: true },
    poolType: { type: String, required: true, lowercase: true, trim: true },
    lpPercentage: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LiquidityPool", liquidityPoolSchema);
