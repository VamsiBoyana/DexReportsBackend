const User = require("../models/User");
const companysWallets = require('../models/companysWallets');


// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get user by ID
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
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

// Update user
exports.updateUser = async (req, res) => {
  console.log("req.body", req.body);
  
  try {
    // Prevent password updates through this route
    if (req.body.password) {
      delete req.body.password;
    }

    // Regular users can only update their own profile
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({
        status: "error",
        message: "You can only update your own profile",
      });
    }

    // Only admins can change roles
    if (req.body.role && req.user.role !== "admin") {
      delete req.body.role;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};


// Delete user (soft delete)
exports.deleteUser = async (req, res) => {
  try {
    // Prevent self-deletion for admins
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        status: "error",
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Reactivate user (Admin only)
exports.reactivateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "User reactivated successfully",
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

// Change user role (Admin only)
exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Role must be either 'user' or 'admin'",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "User role updated successfully",
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


exports.getCompanyWallets = async (req, res, next) => {
  try {
    const { page=1,limit=10,...filters } = req.query;
    const filterConditions = {}; 
     for (let key in filters) {
      if (filters[key]) {
        filterConditions[key] = { $regex: filters[key], $options: "i" }; // Case-insensitive search
      }
    } 
    const companyWallets = await companysWallets.find(filterConditions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const totalCount = await companysWallets.countDocuments({ ...filterConditions, status:"active" });

    res.status(200).json({
      totalCount,
      currentPage: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / limit),
      data: companyWallets,
    });
  } catch (error) {
    console.error("Error fetching company wallets:", error);
    res.status(500).json({ message: "Failed to fetch company wallets", error: error.message });
  }
};