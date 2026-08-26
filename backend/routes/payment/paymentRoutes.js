const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const {
  createPayment,
  getPayment,
  getUserPayments,
  getAdminPayments,
  refundPayment,
  createConnectOnboardingSession,
  getConnectStatus,
  getConnectDashboardLink,
} = require("../../controllers/payment/paymentController");

const router = express.Router();

// Stripe Connect Endpoints
router.post("/stripe-connect/onboard", authMiddleware, createConnectOnboardingSession);
router.get("/stripe-connect/status", authMiddleware, getConnectStatus);
router.get("/stripe-connect/status/:userId", authMiddleware, adminMiddleware, getConnectStatus);
router.post("/stripe-connect/dashboard-link", authMiddleware, getConnectDashboardLink);

// Core Payment Endpoints
router.post("/create", authMiddleware, createPayment);
router.get("/my-payments", authMiddleware, getUserPayments);
router.get("/admin/payments", authMiddleware, adminMiddleware, getAdminPayments);
router.get("/:id", authMiddleware, getPayment);
router.post("/refund/:id", authMiddleware, adminMiddleware, refundPayment);

module.exports = router;