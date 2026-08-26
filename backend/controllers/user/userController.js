const UserModel = require("../../models/userModel");

/**
 * GET /api/user/public-professionals OR /api/auth/public-professionals
 * Fetches all approved professionals for user discovery
 */
const getPublicProfessionals = async (req, res) => {
  try {
    const professionals = await UserModel.find({
      role: "PROFESSIONAL",
      professionalStatus: { $in: ["approved", "APPROVED"] },
    }).select(
      "firstName lastName email profilePhoto bio specialization professionalType sessionFee availability rating professionalStatus isVerified"
    );

    return res.status(200).json({
      success: true,
      count: professionals.length,
      professionals,
    });
  } catch (error) {
    console.error("Error fetching public professionals for users:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching public professionals",
    });
  }
};

/**
 * GET /api/user/public-professionals/:id OR /api/auth/public-professionals/:id
 * Fetches a single approved professional with their availability schedule for user appointment booking
 */
const getPublicProfessionalById = async (req, res) => {
  try {
    const { id } = req.params;

    const professional = await UserModel.findOne({
      _id: id,
      role: "PROFESSIONAL",
      professionalStatus: { $in: ["approved", "APPROVED"] },
    }).select(
      "firstName lastName email profilePhoto bio specialization professionalType sessionFee availability rating professionalStatus isVerified"
    );

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Approved professional not found",
      });
    }

    return res.status(200).json({
      success: true,
      professional,
    });
  } catch (error) {
    console.error("Error fetching public professional availability details:", error);

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
