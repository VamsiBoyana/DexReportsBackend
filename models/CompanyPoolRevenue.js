const mongoose = require("mongoose");

const poolRevenueSchema = new mongoose.Schema(
  {
    batchId: { type: String, index: true },
    wallet: { type: String, required: true, index: true },
    pairAddress: { type: String, required: true, index: true },
    pool: { type: String, required: true, index: true },
    platform: { type: String, default: "" },
    range: { type: String, default: "" },
    current_price: { type: String, default: "" },
    apr: { type: Number, default: 0 },
    pending_rewards: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    tokenATokens: { type: Number, default: 0 },
    tokenAInUsd: { type: Number, default: 0 },
    tokenBTokens: { type: Number, default: 0 },
    tokenBInUsd: { type: Number, default: 0 },
    fetchedAt: { type: Date, default: Date.now, index: true },
    startTime:{ type: Number, default: 0 }
  },
  { timestamps: true }
);

poolRevenueSchema.index({ batchId: 1, wallet: 1, pool: 1 });

module.exports = mongoose.model("CompanyPoolRevenue", poolRevenueSchema);

