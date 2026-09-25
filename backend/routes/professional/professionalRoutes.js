const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const professionalMiddleware = require("../../middleware/professionalMiddleware");

const {
  getProfessionalDashboard,
  getProfessionalProfile,
  updateProfessionalProfile,
  changeProfessionalPassword,
  getProfessionalBookings,
  getProfessionalBookingById,
  getAvailability,
  updateAvailability,
  getProfessionalEarnings,
} = require("../../controllers/professional/professionalController");

const router = express.Router();

router.use(authMiddleware);
router.use(professionalMiddleware);

router.get("/dashboard", getProfessionalDashboard);

router.get("/profile", getProfessionalProfile);
router.put("/profile", updateProfessionalProfile);
router.put("/change-password",authMiddleware,changeProfessionalPassword);

router.get("/bookings", getProfessionalBookings);
router.get("/bookings/:id", getProfessionalBookingById);

router.get("/availability", getAvailability);
router.put("/availability", updateAvailability);

router.get("/earnings", getProfessionalEarnings);

module.exports = router;
