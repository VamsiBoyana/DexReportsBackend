const mongoose = require('mongoose');

const tokenDataHistorySchema = new mongoose.Schema({
   tokenName: { type: String, default: "" },
   tokenSymbol: { type: String, default: "" },
   tokenAddress: { type: String, default: "" },
   tokenIcon: { type: String, default: "" },
   totalTransactions: { type: Number, default: 0 },
   buys: { type: Number, default: 0 },
   sells: { type: Number, default: 0 },
   totalVolume: { type: Number, default: 0 },
   totalCost : {type: Number, default: 0},
   from_time: { type: Number, default: 0 },
   LPadded: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model("TokenReport", tokenDataHistorySchema);