// const mongoose = require('mongoose');
 
// const walletReportSchema = new mongoose.Schema({
//   tokenName: { type: String, required: true },
//   tokenSymbol: { type: String, required: true },
//   tokenIcon: { type: String, required: true },
//   wallet: { type: String, required: true },
//   token: { type: String, required: true },  // mintAddress
//   totalTransactions: { type: Number, required: true },
//   buys: { type: Number, required: true },
//   sells: { type: Number, required: true },
//   resetBuys: { type: Number, required: true },
//   resetSells: { type: Number, required: true },
//   solAverage: { type: Number, required: true },
//   resetBuyVolumeUSD: { type: Number, required: true },
//   resetSellVolumeUSD: { type: Number, required: true },
//   agentBuys: { type: Number, required: true },
//   agentSells: { type: Number, required: true },
//   agentsVolume: { type: Number, required: true },
//   totalVolume: { type: Number, required: true },
//   resetsVolume: { type: Number, required: true },  // Missing field added
//   bundles: { type: Number, default: 0 },
//   pooledTokenAverage: { type: Number, required: true },
//   pooledSolAverage: { type: Number, required: true },
//   slippage: { type: Number, required: true },
//   lpAdd: { type: String, required: true },  // Assuming it's a string (address)
//   averageVolume: { type: Number, required: true },
//   walletBalanceValue: { type: Number, required: true },
//   walletCost: { type: Number, required: true },
//   gasFee: { type: Number, required: true },  // Missing field added
//   gasFeeInDollars: { type: Number, required: true },  // Missing field added
//   rayFee: { type: Number, required: true },  // Missing field added
//   from_time: { type: Number, required: true },  // Unix timestamp
//   to_time: { type: Number, required: true },    // Unix timestamp
// }, { timestamps: true });  // Automatically adds createdAt and updatedAt fields
 
// module.exports = mongoose.model('WalletReport', walletReportSchema);



const mongoose = require('mongoose');

const walletReportSchema = new mongoose.Schema({
  tokenName: { type: String, required: true },
  tokenIcon: { type: String, required: false },
  tokenSymbol: { type: String, required: true },
  walletAddress: { type: String, required: true },
  token: { type: String, required: true }, // tokenAddress or mintAddress
 
  totalTransactions: { type: Number, required: true },
  totalVolume: { type: Number, required: true },
  buys: { type: Number, required: true },
  sells: { type: Number, required: true },
  BuyVolume: { type: Number, required: false, },
  SellVolume: { type: Number, required: false, },

  resets: { type: Number, required: false },
  resetBuys: { type: Number, required: false },
  resetSells: { type: Number, required: false },
  resetsVolume: { type: Number, required: false },
 
  solAverage: { type: Number, required: true },
  addressAverage: { type: Number, required: false, },
  tokenAverage: { type: Number, required: true },
  resetBuyVolumeUSD: { type: Number, required: false },
  resetSellVolumeUSD: { type: Number, required: false },
 
  agentBuys: { type: Number, required: false },
  agentSells: { type: Number, required: false },
  agentsVolume: { type: Number, required: false },
  bundles: { type: Number, required: false },
 
  pooledTokenAverage: { type: Number, required: true },
  pooledSolAverage: { type: Number, required: true },
 
  // slippageAvginDollars: { type: Number, required: true },
  lpAdd: { type: String, required: true }, // liquidity pool address
 
  // averageVolume: { type: Number, required: true },
  gasFee: { type: Number, required: true },
  gasFeeInDollars: { type: Number, required: true },
  rayFee: { type: Number, required: true },
  rayCost: { type: Number, required: true },
 
  walletEndBalance: { type: Number, required: true },
  walletStartBalance: { type: Number, required: true },
  ExpectedCost: { type: Number, required: true },
  walletLoss: { type: Number, required: true },
  slipageAndloss: { type: Number, required: true },
  pP: { type: Number, required: true },
  cost: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  netCost: { type: Number, required: true },
  priceImpact: { type: Number, required: true },
  tip: { type: Number, required: false },

  pairAddress: { type: String, default: "" },
  symbol: { type: String, default: "" },
  poolType: { type: String, default: "" },
  yeild: { type: Number, default: 0 },

 
  from_time: { type: Number, required: true }, // Unix timestamp
  to_time: { type: Number, required: true },   // Unix timestamp
 
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
}, { timestamps: true }); 

// Creating the model
module.exports = mongoose.model('WalletReport', walletReportSchema);


