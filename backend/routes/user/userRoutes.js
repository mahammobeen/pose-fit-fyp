const express = require("express");

const {
  getPublicProfessionals,
  getPublicProfessionalById,
} = require("../../controllers/user/userController");
const { handleChatbot } = require("../../controllers/user/chatbotController");
const UserMetricsController = require("../../controllers/user/userMetricsController");
const authMiddleware = require("../../middleware/authMiddleware");

const router = express.Router();
const dietPlanController = require("../../controllers/user/dietPlanController");

// User-side public professional discovery and availability lookup
router.get("/professionals", getPublicProfessionals);

router.get("/public-professionals", getPublicProfessionals);
router.get("/public-professionals/:id", getPublicProfessionalById);
router.post("/chatbot", handleChatbot);

// User metrics routes
router.post("/user-metrics/:userId", UserMetricsController.save);
router.get("/user-metrics/:userId", UserMetricsController.get);

// Diet Plan routes
router.post("/diet-plan/:userId", dietPlanController.generatePlan);
router.get("/diet-plan/:userId", dietPlanController.getCurrentPlan);
router.get("/diet-plan/:userId/today", dietPlanController.getTodayPlan);

module.exports = router;