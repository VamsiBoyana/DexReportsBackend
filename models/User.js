// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const validator = require("validator");

// const userSchema = new mongoose.Schema({
//   username: {
//     type: String,
//     required: [true, "Username is required"],
//     unique: true,
//     trim: true,
//     minlength: [3, "Username must be at least 3 characters long"],
//     maxlength: [30, "Username cannot exceed 30 characters"],
//   },
//   email: {
//     type: String,
//     required: [true, "Email is required"],
//     unique: true,
//     lowercase: true,
//     validate: [validator.isEmail, "Please provide a valid email"],
//   },
//   password: {
//     type: String,
//     required: [true, "Password is required"],
//     minlength: [6, "Password must be at least 6 characters long"],
//     select: false,
//   },
//   role: {
//     type: String,
//     enum: ["user", "admin"],
//     default: "user",
//   },
//   isActive: {
//     type: Boolean,
//     default: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Hash password before saving
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();

//   this.password = await bcrypt.hash(this.password, 12);
//   this.updatedAt = Date.now();
//   next();
// });

// // Update timestamp on update
// userSchema.pre("findOneAndUpdate", function (next) {
//   this.set({ updatedAt: Date.now() });
//   next();
// });

// // Compare password method
// userSchema.methods.correctPassword = async function (candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// // Check if user is admin
// userSchema.methods.isAdmin = function () {
//   return this.role === "admin";
// };

// // Method to check if password was changed after token was issued
// userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
//   if (this.passwordChangedAt) {
//     const changedTimestamp = parseInt(
//       this.passwordChangedAt.getTime() / 1000,
//       10
//     );
//     return JWTTimestamp < changedTimestamp;
//   }
//   return false;
// };

// module.exports = mongoose.model("User", userSchema);



const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters long"],
    select: false,
  },
  role: {
    type: String,
    enum: ["superadmin", "admin", "superuser"],
    default: "superuser",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.updatedAt = Date.now();
  next();
});

// Update timestamp on update
userSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Compare password method
userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user is admin
userSchema.methods.isAdmin = function () {
  return this.role === "admin";
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = mongoose.model("User", userSchema);
