const express = require("express");

const { getPublicProfessionals, getPublicProfessionalById } = require("../../controllers/user/userController");
const { handleChatbot } = require("../../controllers/user/chatbotController");
const UserMetricsController = require("../../controllers/user/userMetricsController");
const dietPlanController = require("../../controllers/user/dietPlanController");

const router = express.Router();

router.get("/public-professionals", getPublicProfessionals);
router.get("/public-professionals/:id", getPublicProfessionalById);
router.post("/chatbot", handleChatbot);

router.post("/user-metrics/:userId", UserMetricsController.save);
router.get("/user-metrics/:userId", UserMetricsController.get);

router.post("/diet-plan/:userId", dietPlanController.generatePlan);
router.get("/diet-plan/:userId", dietPlanController.getCurrentPlan);
router.get("/diet-plan/:userId/today", dietPlanController.getTodayPlan);

module.exports = router;