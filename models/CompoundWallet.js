const mongoose = require('mongoose');

const compoundWalletSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

}, { timestamps: true });

const CompoundWallet = mongoose.model('CompoundWallet', compoundWalletSchema);

module.exports = CompoundWallet;