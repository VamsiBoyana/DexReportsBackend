//  const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// exports.protect = async (req, res, next) => {
//   // console.log("\nreq.headers.authorization in protect", req.headers.authorization);
  
//   try {
//     let token;

//     // Check if token exists in headers
//     if (
//       req.headers.authorization &&
//       req.headers.authorization.startsWith("Bearer")
//     ) {
//       token = req.headers.authorization.split(" ")[1];
//     }

//     if (!token) {
//       return res.status(401).json({
//         status: "error",
//         message: "You are not logged in. Please log in to get access.",
//       });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Check if user still exists
//     const currentUser = await User.findById(decoded.id);
//     if (!currentUser) {
//       return res.status(401).json({
//         status: "error",
//         message: "The user belonging to this token no longer exists.",
//       });
//     }

//     // Check if user changed password after the token was issued
//     if (currentUser.changedPasswordAfter(decoded.iat)) {
//       return res.status(401).json({
//         status: "error",
//         message: "User recently changed password! Please log in again.",
//       });
//     }

//     // Check if user is active
//     if (!currentUser.isActive) {
//       return res.status(401).json({
//         status: "error",
//         message: "Your account has been deactivated.",
//       });
//     }

//     // Grant access to protected route
//     req.user = currentUser;

//     // console.log("\nreq.user", req.user);
    
//     next();
//   } catch (error) {
//     return res.status(401).json({
//       status: "error",
//       message: "Invalid token. Please log in again.",
//     });
//   }
// };

// // Restrict to admin users
// exports.restrictToAdmin = (req, res, next) => {
//   console.log("\nreq.user in restrictToAdmin", req.user);
  
//   if (req.user.role !== "admin") {
//     return res.status(403).json({
//       status: "error",
//       message: "You do not have permission to perform this action",
//     });
//   }
//   next();
// };

// exports.generateToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRES_IN,
//   });
// };



 const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  // console.log("\nreq.headers.authorization in protect", req.headers.authorization);
  
  try {
    let token;

    // Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "You are not logged in. Please log in to get access.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: "error",
        message: "The user belonging to this token no longer exists.",
      });
    }

    // Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: "error",
        message: "User recently changed password! Please log in again.",
      });
    }

    // Check if user is active
    if (!currentUser.isActive) {
      return res.status(401).json({
        status: "error",
        message: "Your account has been deactivated.",
      });
    }

    // Grant access to protected route
    req.user = currentUser;

    // console.log("\nreq.user", req.user);
    
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid token. Please log in again.",
    });
  }
};

// Restrict to admin users
exports.restrictToAdmin = (req, res, next) => {
  console.log("\nreq.user in restrictToAdmin", req.user);
  
  if (req.user.role !== "admin") {
    return res.status(403).json({
      status: "error",
      message: "You do not have permission to perform this action",
    });
  }
  next();
};

exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
