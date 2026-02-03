const mongoose = require('mongoose');

const walletDataSchema = new mongoose.Schema({
    tokenName: { type: String, required: true },
    walletBalance: { type: Number, default: 0 },
    token_symbol: { type: String, required: true },
    token_icon: { type: String, required: true },
    tokenAddress: { type: String, required: true },
    tokenDecimals: { type: Number, default: 0 },
    tokenPrice: { type: Number, default: 0 }
}, { timestamps: true });

const WalletData = mongoose.model('WalletData', walletDataSchema);

module.exports = WalletData;
