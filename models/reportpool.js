const mongoose = require("mongoose");

const ReportPoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    poolType: { type: String, required: true },
    address: { type: String, required: true },
    pairAddress: { type: String, required: true },
    tokenAddress: { type: String, required: true },
    totalTransactions: { type: Number,required: false},
    buys: { type: Number,required: false },
    sells: { type: Number, required: false },
    buysVolume: { type: Number, required: false },
    sellsVolume: { type: Number, required: false },
    totalVolume: { type: Number, default: 0 },
    // LPadded: { type: Number, default: 0 }, // total LP added in USD or token units
    poolFee: { type: Number, default: 0 },
    poolLiquidity: { type: Number, default: 0 },
    companysLiquidity: { type: Number, default: 0 },
    usersLiquidity: { type: Number, default: 0 },
    poolRevenue: { type: Number, default: 0 },
    companysRevenue: { type: Number, default: 0 },
    usersRevenue: { type: Number, default: 0 },
    compoundRevenue: { type: Number, default: 0 },
    compoundLiquidity: { type: Number, default: 0 },
    addressAverage: { type: Number, default: 0 },
    tokenAverage: { type: Number, default: 0 },
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true },
  },
  { timestamps: true }
);


module.exports = mongoose.model("reportpool", ReportPoolSchema);