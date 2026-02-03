const mongoose = require('mongoose');

const poolWalletDataSchema = new mongoose.Schema({
    poolId: {
        type: mongoose.Schema.Types.ObjectId, ref: 'LiquidityPool',
        required: true,
    },
    poolWalletAddress: {
        type: String,
        required: true,
    },
    innerWalletAddress: {
        type: String,
        required: true,
    },
}, { timestamps: true });

const poolWalletData = mongoose.model('poolWalletData', poolWalletDataSchema);

module.exports = poolWalletData;
