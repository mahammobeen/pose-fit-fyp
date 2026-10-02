const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");

const {
  signup,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  completeProfessionalProfile,
  resendVerificationCode,
} = require("../../controllers/auth/authController");

const router = express.Router();

router.post("/register", signup);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationCode);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/", resetPassword);
router.put(
  "/complete-professional-profile",
  authMiddleware,
  completeProfessionalProfile,
);

module.exports = router;
