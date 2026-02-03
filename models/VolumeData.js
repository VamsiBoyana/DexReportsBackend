// const mongoose = require("mongoose");

// // Define the schema for the volume data
// const volumeDataSchema = new mongoose.Schema(
//   {
//     pairId: {
//       type: String, // Assuming each pairId is a string
//       required: true,
//     },
//     day: {
//       type: Number, // This will store the day (e.g., 20250910)
//       required: true,
//     },
//     value: {
//       type: Number, // This will store the value of the volume
//       required: true,
//     },
//   },
//   {
//     timestamps: true, // Automatically add createdAt and updatedAt fields
//   }
// );

// // Add a unique index on the combination of `pairId` and `day`
// volumeDataSchema.index({ pairId: 1, day: 1 }, { unique: true });

// // Create and export the model
// const VolumeData = mongoose.model("VolumeData", volumeDataSchema);
// module.exports = VolumeData;

const mongoose = require("mongoose");

const volumeDataSchema = new mongoose.Schema({
  pool_address: {
    type: String,
    required: true,
  },
  program_id: String,
  total_volume_24h: Number,
  total_volume_change_24h: Number,
  total_trades_24h: Number,
  total_trades_change_24h: Number,
  tvl: Number,
  day: {
    type: Number,
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient querying
volumeDataSchema.index({ pool_address: 1, day: 1 });

module.exports = mongoose.model("VolumeData", volumeDataSchema);
