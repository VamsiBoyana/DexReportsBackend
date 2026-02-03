const User = require("../models/User");
const { generateToken } = require("../middleware/auth");
const PasswordReset = require("../models/PasswordReset");
const { sendEmail } = require("../config/email");
const crypto = require("crypto");
const {verifyRecaptcha} = require("./verifyRecaptcha.js")

// Sign up a new user
// exports.signup = async (req, res) => {
//   try {
//     const { username, email, password, role } = req.body;

//     // Check if user already exists
//     const existingUser = await User.findOne({
//       $or: [{ email }, { username }],
//     });

//     if (existingUser) {
//       return res.status(400).json({
//         status: "error",
//         message: "User with this email or username already exists",
//       });
//     }

//     // Prevent non-admins from creating admin accounts
//     const userData = { username, email, password };
//     if (role && req.body && req.body.role === "admin") {
//       userData.role = role;
//     }

//     // Create new user
//     const newUser = await User.create(userData);

//     // Remove password from output
//     newUser.password = undefined;

//     res.status(201).json({
//       status: "success",
//       message: "User created successfully",
//       data: {
//         user: newUser,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: "error",
//       message: error.message,
//     });
//   }
// };


exports.signup = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "Email already exists",
      });
    }

    const newUser = await User.create({
      username,
      email,
      password,
      role,
    });

    res.status(201).json({
      status: "success",
      message: "User created successfully",
      data: {
        user: {
          _id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: "error",
        message: "Email already exists",
      });
    }

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};


// Login user
exports.login = async (req, res) => {
  try {
    const { email, password, recaptchaToken } = req.body;
 
    console.log("req.body in login:", req.body);
   
 
    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Please provide email and password",
      });
    }
 
    const recaptchaVerified = await verifyRecaptcha(recaptchaToken);
    console.log("recaptchaVerified in authController:", recaptchaVerified);
 
    if (!recaptchaVerified) {
      return res
        .status(400)
        .json({ success: false, message: "reCAPTCHA verification failed" });
    }

    // Check if user exists && password is correct
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: "error",
        message: "Incorrect email or password",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        status: "error",
        message: "Your account has been deactivated",
      });
    }

    // If everything ok, send token to client
    const token = generateToken(user._id);

    // Remove password from output
    user.password = undefined;

    res.status(200).json({
      status: "success",
      message: "Logged in successfully",
      token,
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    res.status(200).json({
      status: "success",
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Please provide your email address",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "No user found with this email address",
      });
    }

    // Generate OTP
    const otp = PasswordReset.generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Delete any existing reset tokens for this user
    await PasswordReset.deleteMany({ userId: user._id });

    // Create new password reset token
    const passwordReset = await PasswordReset.create({
      userId: user._id,
      email: user.email,
      otp,
      expiresAt,
    });

    // Send email with OTP
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${user.username},</p>
        <p>You requested to reset your password. Use the OTP below to reset your password:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This OTP will expire in 15 minutes.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: "Password Reset OTP - DEX Dashboard",
      html,
    });

    res.status(200).json({
      status: "success",
      message: "OTP sent to your email address",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      status: "error",
      message: "Error sending OTP. Please try again later.",
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Please provide email and OTP",
      });
    }

    // Find the reset token
    const resetToken = await PasswordReset.findOne({
      email,
      otp,
      used: false,
    });

    if (!resetToken) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP",
      });
    }

    // Check if OTP is expired
    if (resetToken.isExpired()) {
      await PasswordReset.findByIdAndDelete(resetToken._id);
      return res.status(400).json({
        status: "error",
        message: "OTP has expired",
      });
    }

    // Mark OTP as used
    resetToken.used = true;
    await resetToken.save();

    // Generate a temporary token for password reset
    const tempToken = crypto.randomBytes(32).toString("hex");

    res.status(200).json({
      status: "success",
      message: "OTP verified successfully",
      data: {
        resetToken: tempToken,
        userId: resetToken.userId,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      status: "error",
      message: "Error verifying OTP",
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { userId, password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "Please provide password and confirm password",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters long",
      });
    }

    // Find user and update password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    user.password = password;
    user.passwordChangedAt = Date.now() - 1000; // Set password changed time
    await user.save();

    // Delete all reset tokens for this user
    await PasswordReset.deleteMany({ userId });

    // Send confirmation email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Successful</h2>
        <p>Hello ${user.username},</p>
        <p>Your password has been successfully reset.</p>
        <p>If you did not perform this action, please contact support immediately.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: "Password Reset Successful - DEX Dashboard",
      html,
    });

    res.status(200).json({
      status: "success",
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      status: "error",
      message: "Error resetting password",
    });
  }
};

// Change password (for logged-in users)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "Please provide all password fields",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: "error",
        message: "New passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "New password must be at least 6 characters long",
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");

    // Check if current password is correct
    if (!(await user.correctPassword(currentPassword))) {
      return res.status(401).json({
        status: "error",
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Send confirmation email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Changed Successfully</h2>
        <p>Hello ${user.username},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you did not perform this action, please contact support immediately.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: "Password Changed - DEX Dashboard",
      html,
    });

    res.status(200).json({
      status: "success",
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      status: "error",
      message: "Error changing password",
    });
  }
};
