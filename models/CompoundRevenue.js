const mongoose = require('mongoose');

const compoundRevenueSchema = new mongoose.Schema(
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
        fetchedAt: { type: Date, default: Date.now, index: true },
        startTime:{ type: Number, default: 0 }
      },
      { timestamps: true }
    );

    compoundRevenueSchema.index({ batchId: 1, wallet: 1, pool: 1 });

    module.exports = mongoose.model('CompoundRevenue', compoundRevenueSchema);