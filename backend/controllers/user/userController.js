const UserModel = require("../../models/userModel");
const PaymentModel = require("../../models/PaymentModel");

const getPublicProfessionals = async (req, res) => {
  try {
    const professionals = await UserModel.find({
      role: "PROFESSIONAL",
      professionalStatus: { $in: ["approved", "APPROVED"] },
    }).select(
      "firstName lastName email profilePhoto bio specialization experience professionalType sessionFee availability rating professionalStatus isVerified",
    );

    return res.status(200).json({
      success: true,
      count: professionals.length,
      professionals,
    });
  } catch (error) {
    console.error("Error fetching public professionals:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching public professionals",
    });
  }
};

const getPublicProfessionalById = async (req, res) => {
  try {
    const { id } = req.params;

    const professional = await UserModel.findOne({
      _id: id,
      role: "PROFESSIONAL",
      professionalStatus: { $in: ["approved", "APPROVED"] },
    }).select(
      "firstName lastName email profilePhoto bio specialization experience professionalType sessionFee availability rating professionalStatus isVerified",
    );

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Approved professional not found",
      });
    }

    const bookedPayments = await PaymentModel.find({
      professional: id,
      status: "completed",
      appointmentDay: { $exists: true, $ne: "" },
      appointmentSlot: { $exists: true, $ne: "" },
    }).select("appointmentDay appointmentSlot");

    const bookedSlots = bookedPayments.map((booking) => ({
      day: booking.appointmentDay,
      slot: booking.appointmentSlot,
    }));

    return res.status(200).json({
      success: true,
      professional,
      bookedSlots,
    });
  } catch (error) {
    console.error("Error fetching public professional details:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching professional details",
    });
  }
};

module.exports = {
  getPublicProfessionals,
  getPublicProfessionalById,
};
