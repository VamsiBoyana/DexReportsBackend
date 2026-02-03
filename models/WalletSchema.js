const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
    tokenId: {
        type: mongoose.Schema.Types.ObjectId, ref: "Token", required: true,
        required: true,
    },
    walletAddress: {
        type: String,
        required: true,
    },
    innerWalletAddress: { 
        type: String, 
        default: "" 
    },
    pairAddress: {
        type: String,
        default: ""
    },
    poolType: {
        type: String,
        default: ""
    },
    symbol: {
        type: String,
        default: ""
    },

}, { timestamps: true });


module.exports = mongoose.model("Wallet", WalletSchema);