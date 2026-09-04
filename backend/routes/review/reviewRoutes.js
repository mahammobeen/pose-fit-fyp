const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const {
  createReview,
  getPendingRatings,
  getMyReviews,
  getPaymentReview,
  getProfessionalReviews,
  getPlatformReviews,
  getAllReviews,
  deleteReview,
} = require("../../controllers/review/reviewController");

const router = express.Router();

// Public routes
router.get("/professional/:professionalId", getProfessionalReviews);
router.get("/platform", getPlatformReviews);

// Protected routes (User)
router.post("/", authMiddleware, createReview);
router.post("/professional", authMiddleware, createReview);
router.post("/platform", authMiddleware, createReview);
router.get("/pending-ratings", authMiddleware, getPendingRatings);
router.get("/my-reviews", authMiddleware, getMyReviews);
router.get("/payment/:paymentId", authMiddleware, getPaymentReview);
router.delete("/:id", authMiddleware, deleteReview);

// Admin routes
router.get("/admin", authMiddleware, adminMiddleware, getAllReviews);
router.get("/admin/all", authMiddleware, adminMiddleware, getAllReviews);

module.exports = router;