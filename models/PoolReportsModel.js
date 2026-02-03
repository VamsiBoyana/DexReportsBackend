const mongoose = require('mongoose');

const poolReportSchema = new mongoose.Schema({
  pairAddress: { type: String, required: true, index: true },
  tokenAddress: { type: String, required: true },
  tokenName: { type: String, required: true },
  tokenSymbol: { type: String, required: true },
  tokenIcon: { type: String, default: "" },
  poolType: { type: String, default: "", index: true },
  
  // Aggregated totals from all wallets
  totalTransactions: { type: Number, default: 0 },
  totalVolume: { type: Number, default: 0 },
  mmTotalVolume: { type: Number, default: 0 },
  usersTotalVolume: { type: Number, default: 0 },
  poolYeild: { type: Number, default: 0 },
  mmYeild: { type: Number, default: 0 },
  ARBuserYeild: { type: Number, default: 0 },
  companysYeild: { type: Number, default: 0 },
  usersYeild: { type: Number, default: 0 },
  poolLiquidity: { type: Number, default: 0 },
  companysLiquidity: { type: Number, default: 0 },
  usersLiquidity: { type: Number, default: 0 },
  buys: { type: Number, default: 0 },
  sells: { type: Number, default: 0 },
  
  resetBuys: { type: Number, default: 0 },
  resetSells: { type: Number, default: 0 },
  resetsVolume: { type: Number, default: 0 },
  
  resetBuyVolumeUSD: { type: Number, default: 0 },
  resetSellVolumeUSD: { type: Number, default: 0 },
  
  agentBuys: { type: Number, default: 0 },
  agentSells: { type: Number, default: 0 },
  agentsVolume: { type: Number, default: 0 },
  bundles: { type: Number, default: 0 },
  
  pooledTokenAverage: { type: Number, default: 0 },
  pooledSolAverage: { type: Number, default: 0 },
  
  lpAdd: { type: Number, default: 0 },
  gasFee: { type: Number, default: 0 },
  gasFeeInDollars: { type: Number, default: 0 },
  poolRayCost: { type: Number, default: 0 },
  mmRayCost: { type: Number, default: 0 },
  mmRayFee: { type: Number, default: 0 },
  poolRayFee: { type: Number, default: 0 },
  
  walletEndBalance: { type: Number, default: 0 },
  walletStartBalance: { type: Number, default: 0 },
  ExpectedCost: { type: Number, default: 0 },
  walletLoss: { type: Number, default: 0 },
  slipageAndloss: { type: Number, default: 0 },
  pP: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  netCost: { type: Number, default: 0 },
  priceImpact: { type: Number, default: 0 },
  tip: { type: Number, default: 0 },
  
  // Averages (weighted or simple average)
  solAverage: { type: Number, default: 0 },
  tokenAverage: { type: Number, default: 0 },
  addressAverage: { type: Number, default: 0 },
  
  // Wallet count for this pool
  walletCount: { type: Number, default: 0 },
  
  // Time fields
  from_time: { type: Number, default: 0 },
  to_time: { type: Number, default: 0 },
  startTime: { type: Number, default: 0 },
  endTime: { type: Number, default: 0 },
  clientRevenueCost:{type:Number ,default:0},
  netCompanyCost:{type:Number ,default:0}
  
}, { timestamps: true });

// Index for faster queries
poolReportSchema.index({ pairAddress: 1, startTime: 1 });

module.exports = mongoose.model('WalletReportsPairWise', poolReportSchema);

