const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const {
  getAllUsers,
  userDetails,
  deleteUser,
  updateUser,
  getStats,
  getProfessionals,
  addProfessional,
  deleteProfessional,
  getAnalytics,
  getPendingProfessionals,
  updateProfessionalStatus,
  changeAdminPassword,
} = require("../../controllers/admin/adminController");

const router = express.Router();

router.get("/get-all-users", authMiddleware, adminMiddleware, getAllUsers);
router.get("/user-details", authMiddleware, adminMiddleware, userDetails);
router.delete("/delete-user/:id", authMiddleware, adminMiddleware, deleteUser);
router.put("/update-user/:id", authMiddleware, adminMiddleware, updateUser);
router.get("/stats", authMiddleware, adminMiddleware, getStats);
router.get("/get-professionals", authMiddleware, adminMiddleware, getProfessionals);
router.post("/add-professional", authMiddleware, adminMiddleware, addProfessional);
router.delete("/delete-professional/:id", authMiddleware, adminMiddleware, deleteProfessional);
router.get("/analytics", authMiddleware, adminMiddleware, getAnalytics);
router.get("/professional-requests", authMiddleware, adminMiddleware, getPendingProfessionals);
router.put("/professional-status/:id", authMiddleware, adminMiddleware, updateProfessionalStatus);
router.put("/change-password", authMiddleware, adminMiddleware, changeAdminPassword);

module.exports = router;