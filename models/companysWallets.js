const mongoose = require("mongoose");

const companysWalletsSchema = new mongoose.Schema({
   walletAddress: { type: String, required: true, index: true },
   status: { type: String, enum: ["active", "inactive"], default: "active" },

}, { timestamps: true });

module.exports = mongoose.model("CompanysWallets", companysWalletsSchema);