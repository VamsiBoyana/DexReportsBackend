const express = require("express");
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  reactivateUser,
  changeUserRole,
  getCompanyWallets
} = require("../controllers/userController");
const { protect, restrictToAdmin } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// Admin only routes
router.get("/", restrictToAdmin, getAllUsers);
router.patch("/:id/reactivate", restrictToAdmin, reactivateUser);
router.patch("/:id/role", restrictToAdmin, changeUserRole);

// Mixed access routes
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.delete("/:id", restrictToAdmin, deleteUser);

router.get("/companyWallets", getCompanyWallets);


module.exports = router;
