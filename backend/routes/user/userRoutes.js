const express = require("express");

const {
  getPublicProfessionals,
  getPublicProfessionalById,
} = require("../../controllers/user/userController");
const { handleChatbot } = require("../../controllers/user/chatbotController");
const UserMetricsController = require("../../controllers/user/userMetricsController");

const router = express.Router();

// User-side public professional discovery and availability lookup
router.get("/professionals", getPublicProfessionals);

router.get("/public-professionals", getPublicProfessionals);
router.get("/public-professionals/:id", getPublicProfessionalById);
router.post("/chatbot", handleChatbot);

// now you use it like:
router.post("/user-metrics/:userId", UserMetricsController.save);
router.get("/user-metrics/:userId", UserMetricsController.get);

// router.get("/diet_plan/:userId", UserMetricsController.generateDietPlan);

module.exports = router;
