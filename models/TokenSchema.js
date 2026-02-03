const mongoose = require("mongoose");
 
const tokenSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    symbol: { type: String, required: true },
 
    platformId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Platform",
      required: true,
      index: true,
    },
    networkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Network",
      required: true,
    },
 
    tokenAddress: { type: String, default: null },
    pairAddress: { type: String, default: null },
    solAddress: { type: String, default: null },
    lpMint: { type: String, default: null },

 
    status: { type: Boolean, default: false },
    url: { type: String, default: "" },
 
    chainId: { type: String, required: true, index: true },
 
    usd_min: { type: Number, default: 0 },
    token_logo_url: { type: String, default: "" },
  },
  { timestamps: true }
);
 
// Uniqueness per chain (must match how you store chainId + tokenAddress)
tokenSchema.index(
  { chainId: 1, tokenAddress: 1 },
  {
    unique: true,
    partialFilterExpression: { tokenAddress: { $type: "string" } },
  }
);
 
// Fast filter for chain + platform lists
tokenSchema.index({ chainId: 1, platformId: 1 });
 
module.exports = mongoose.model("Token", tokenSchema);
 
