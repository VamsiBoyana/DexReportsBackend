// const validator = require("validator");

// exports.validateSignup = (req, res, next) => {
//   const { username, email, password, role } = req.body;

//   // Check if all required fields are provided
//   if (!username || !email || !password) {
//     return res.status(400).json({
//       status: "error",
//       message: "Please provide username, email, and password",
//     });
//   }

//   // Validate email
//   if (!validator.isEmail(email)) {
//     return res.status(400).json({
//       status: "error",
//       message: "Please provide a valid email address",
//     });
//   }

//   // Validate password strength
//   if (password.length < 6) {
//     return res.status(400).json({
//       status: "error",
//       message: "Password must be at least 6 characters long",
//     });
//   }

//   // Validate username
//   if (username.length < 3) {
//     return res.status(400).json({
//       status: "error",
//       message: "Username must be at least 3 characters long",
//     });
//   }

//   // Validate role if provided
//   if (role && !["user", "admin"].includes(role)) {
//     return res.status(400).json({
//       status: "error",
//       message: "Role must be either 'user' or 'admin'",
//     });
//   }

//   next();
// };

// exports.validateLogin = (req, res, next) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({
//       status: "error",
//       message: "Please provide email and password",
//     });
//   }

//   if (!validator.isEmail(email)) {
//     return res.status(400).json({
//       status: "error",
//       message: "Please provide a valid email address",
//     });
//   }

//   next();
// };

// exports.validateForgotPassword = (req, res, next) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({
//       status: "error",
//       message: "Please provide your email address",
//     });
//   }

//   if (!validator.isEmail(email)) {
//     return res.status(400).json({
//       status: "error",
//       message: "Please provide a valid email address",
//     });
//   }

//   next();
// };

// exports.validateResetPassword = (req, res, next) => {
//   const { password, confirmPassword } = req.body;

//   if (!password || !confirmPassword) {
//     return res.status(400).json({
//       status: "error",
//       message: "Please provide password and confirm password",
//     });
//   }

//   if (password !== confirmPassword) {
//     return res.status(400).json({
//       status: "error",
//       message: "Passwords do not match",
//     });
//   }

//   if (password.length < 6) {
//     return res.status(400).json({
//       status: "error",
//       message: "Password must be at least 6 characters long",
//     });
//   }

//   next();
// };

// exports.validateChangePassword = (req, res, next) => {
//   const { currentPassword, newPassword, confirmPassword } = req.body;

//   if (!currentPassword || !newPassword || !confirmPassword) {
//     return res.status(400).json({
//       status: "error",
//       message: "Please provide all password fields",
//     });
//   }

//   if (newPassword !== confirmPassword) {
//     return res.status(400).json({
//       status: "error",
//       message: "New passwords do not match",
//     });
//   }

//   if (newPassword.length < 6) {
//     return res.status(400).json({
//       status: "error",
//       message: "New password must be at least 6 characters long",
//     });
//   }

//   next();
// };



const validator = require("validator");

exports.validateSignup = (req, res, next) => {
  const { username, email, password, role } = req.body;

  // Check if all required fields are provided
  if (!username || !email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Please provide username, email, and password",
    });
  }

  // Validate email
  if (!validator.isEmail(email)) {
    return res.status(400).json({
      status: "error",
      message: "Please provide a valid email address",
    });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({
      status: "error",
      message: "Password must be at least 6 characters long",
    });
  }

  // Validate username
  if (username.length < 3) {
    return res.status(400).json({
      status: "error",
      message: "Username must be at least 3 characters long",
    });
  }

  // Validate role if provided
  if (role && !["superadmin", "admin", "superuser"].includes(role)) {
    return res.status(400).json({
      status: "error",
      message: "Role must be either 'superadmin' or 'admin' or 'superuser'",
    });
  }

  next();
};

exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Please provide email and password",
    });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({
      status: "error",
      message: "Please provide a valid email address",
    });
  }

  next();
};

exports.validateForgotPassword = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      status: "error",
      message: "Please provide your email address",
    });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({
      status: "error",
      message: "Please provide a valid email address",
    });
  }

  next();
};

exports.validateResetPassword = (req, res, next) => {
  const { password, confirmPassword } = req.body;

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

  next();
};

exports.validateChangePassword = (req, res, next) => {
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

  next();
};
