const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");

const {
  signup,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  completeProfessionalProfile,
} = require("../../controllers/auth/authController");

const {
  getPublicProfessionals,
  getPublicProfessionalById,
} = require("../../controllers/user/userController");
const { handleChatbot } = require("../../controllers/user/chatbotController");

const router = express.Router();

router.post("/register", signup);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:email", resetPassword);
router.put(
  "/complete-professional-profile",
  authMiddleware,
  completeProfessionalProfile,
);
// router.get("/public-professionals", getPublicProfessionals);
// router.get("/public-professionals/:id", getPublicProfessionalById);
// router.post("/chatbot", handleChatbot);

module.exports = router;
