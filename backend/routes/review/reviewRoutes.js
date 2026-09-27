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

router.get("/professional/:professionalId", getProfessionalReviews);
router.get("/platform", getPlatformReviews);

router.post("/", authMiddleware, createReview);
router.post("/professional", authMiddleware, createReview);
router.post("/platform", authMiddleware, createReview);
router.get("/pending-ratings", authMiddleware, getPendingRatings);
router.get("/my-reviews", authMiddleware, getMyReviews);
router.get("/payment/:paymentId", authMiddleware, getPaymentReview);
router.delete("/:id", authMiddleware, deleteReview);

router.get("/admin", authMiddleware, adminMiddleware, getAllReviews);

module.exports = router;