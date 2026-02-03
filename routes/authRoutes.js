const express = require("express");
const { 
  signup, 
  login, 
  getMe, 
  forgotPassword, 
  verifyOTP, 
  resetPassword, 
  changePassword 
} = require("../controllers/authController");
const { 
  validateSignup, 
  validateLogin, 
  validateForgotPassword, 
  validateResetPassword, 
  validateChangePassword 
} = require("../middleware/validation");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/signup", validateSignup, signup);
router.post("/login", validateLogin, login);
router.get("/me", protect, getMe);

// Password reset routes
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", validateResetPassword, resetPassword);
router.post("/change-password", protect, validateChangePassword, changePassword);

module.exports = router;