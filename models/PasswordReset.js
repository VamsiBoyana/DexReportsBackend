const mongoose = require("mongoose");
const crypto = require("crypto");

const passwordResetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Document expires after 1 hour (3600 seconds)
  },
});

// Generate OTP
passwordResetSchema.statics.generateOTP = function () {
  return crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
};

// Check if OTP is expired
passwordResetSchema.methods.isExpired = function () {
  return Date.now() > this.expiresAt;
};

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
