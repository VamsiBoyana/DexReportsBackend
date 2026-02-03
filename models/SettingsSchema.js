const mongoose = require("mongoose");
const settingsSchema = new mongoose.Schema(
  {
    usdMin: { type: Number, default: 0 },
    usdMax: { type: Number, default: 0 },
    gasFeePercentage: { type: Number, default: 0 },
    tierFeePercentage: { type: Number, default: 0 },
    lpRewardPercentage: { type: Number, default: 0 },
    tipAmount: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    status: { type: Boolean, default: true },
    lpRewardPool: { type: Number, default: 0 },
    ourWallet :{type:String,default:null}
  },
  { timestamps: true }
);
module.exports = mongoose.model("Settings", settingsSchema);
