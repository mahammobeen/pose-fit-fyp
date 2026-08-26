const UserModel = require("../../models/userModel");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.USER_PASS,
  },
});

// 1. Get total user count
const getAllUsers = async (req, res) => {
  try {
    const totalUsers = await UserModel.countDocuments({
      role: "USER",
    });

    return res.status(200).json({
      success: true,
      totalUsers,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 2. Get list of all users
const userDetails = async (req, res) => {
  try {
    const users = await UserModel.find({ role: "USER" })
      .select("-password -verificationCode");

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("User details error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 3. Delete user by ID
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await UserModel.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 4. Update user details
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { firstName, lastName, email } = req.body;

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (email) {
      const existingUser = await UserModel.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use by another user",
        });
      }
    }

    const updatedData = {};

    if (firstName) updatedData.firstName = firstName;
    if (lastName) updatedData.lastName = lastName;
    if (email) updatedData.email = email.toLowerCase();

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      updatedData,
      { new: true }
    ).select("-password -verificationCode");

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

// 5. Get dashboard stats
const getStats = async (req, res) => {
  try {
    const totalUsers = await UserModel.countDocuments({
      role: "USER",
    });

    const activeToday = await UserModel.countDocuments({
      role: "USER",
      updatedAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    const newUsers = await UserModel.countDocuments({
      role: "USER",
      createdAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    });

    const totalProfessionals = await UserModel.countDocuments({
      role: "PROFESSIONAL",
    });

    const verifiedUsers = await UserModel.countDocuments({
      role: "USER",
      isVerified: true,
    });

    const conversionRate =
      totalUsers > 0
        ? Math.round((verifiedUsers / totalUsers) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeToday,
        newUsers,
        totalProfessionals,
        conversionRate: `${conversionRate}%`,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching dashboard stats",
    });
  }
};

// 6. Get all professionals for admin
const getProfessionals = async (req, res) => {
  try {
    const professionals = await UserModel.find({
      role: "PROFESSIONAL",
    }).select("-password -verificationCode");

    return res.status(200).json({
      success: true,
      count: professionals.length,
      professionals,
    });
  } catch (error) {
    console.error("Error fetching professionals for admin:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching professionals",
    });
  }
};

// 9. Admin invites / adds a new professional
const addProfessional = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      professionalType,
      specialization,
      sessionFee,
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required",
      });
    }

    const existingUser = await UserModel.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const tempPassword = password || `PoseFit@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newProfessional = new UserModel({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "PROFESSIONAL",
      isVerified: true,
      professionalStatus: "invited",
      professionalType: professionalType || "Trainer",
      specialization: specialization || "",
      sessionFee: sessionFee ? Number(sessionFee) : 0,
      appliedAt: new Date(),
    });

    await newProfessional.save();

    try {
      await transporter.sendMail({
        from: `"PoseFit Admin" <${process.env.USER_EMAIL}>`,
        to: email.toLowerCase(),
        subject: "Welcome to PoseFit - Professional Onboarding Credentials",
        text: `Hi ${firstName} ${lastName},

Congratulations! The PoseFit Admin team has invited you to join PoseFit as a Professional ${professionalType || "Trainer"}.

Here are your initial login credentials:
Login Email: ${email.toLowerCase()}
Temporary Password: ${tempPassword}

Next Steps:
1. Log in to your PoseFit account using these credentials.
2. Complete your professional profile by uploading your bio, photo, credential documents, bank details, and availability schedule.
3. Once submitted, your profile will be reviewed by the admin for final live verification.

Regards,
PoseFit Team`,
      });
    } catch (emailErr) {
      console.error("Failed to send onboarding email:", emailErr);
    }

    return res.status(201).json({
      success: true,
      message: "Professional invited & account created successfully. Credentials emailed to professional.",
      tempPassword,
      professional: {
        _id: newProfessional._id,
        firstName: newProfessional.firstName,
        lastName: newProfessional.lastName,
        email: newProfessional.email,
        role: newProfessional.role,
        professionalStatus: newProfessional.professionalStatus,
        professionalType: newProfessional.professionalType,
        specialization: newProfessional.specialization,
        sessionFee: newProfessional.sessionFee,
      },
    });
  } catch (error) {
    console.error("Error adding professional:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while adding professional",
      error: error.message,
    });
  }
};

// 10. Delete a professional by ID
const deleteProfessional = async (req, res) => {
  try {
    const { id } = req.params;

    const professional = await UserModel.findOneAndDelete({
      _id: id,
      role: "PROFESSIONAL",
    });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Professional removed successfully",
    });
  } catch (error) {
    console.error("Error deleting professional:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while removing professional",
    });
  }
};

// 11. Get admin registration analytics (past 7 days)
const getAnalytics = async (req, res) => {
  try {
    const dates = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().slice(0, 10));
    }

    const startOfRange = new Date();
    startOfRange.setDate(startOfRange.getDate() - 6);
    startOfRange.setHours(0, 0, 0, 0);

    const userStats = await UserModel.aggregate([
      {
        $match: {
          role: "USER",
          createdAt: {
            $gte: startOfRange,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const statsMap = {};

    userStats.forEach((stat) => {
      statsMap[stat._id] = stat.count;
    });

    const analyticsData = dates.map((date) => {
      const dateObject = new Date(date);

      const label = dateObject.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      return {
        date: label,
        registrations: statsMap[date] || 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching analytics data",
    });
  }
};

// 12. Get pending professional applications for verification
const getPendingProfessionals = async (req, res) => {
  try {
    const professionals = await UserModel.find({
      role: "PROFESSIONAL",
      professionalStatus: {
        $in: ["pending_verification", "PENDING_VERIFICATION", "PENDING"],
      },
    })
      .select(
        "firstName lastName email role professionalType specialization bio profilePhoto sessionFee credentialDocs bankDetails availability professionalStatus rejectionReason appliedAt verificationNotes"
      )
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: professionals.length,
      professionals,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get pending professional requests",
      error: error.message,
    });
  }
};

// 13. Admin approves or rejects professional application
const updateProfessionalStatus = async (req, res) => {
  try {
    const { status, rejectionReason, verificationNotes } = req.body;

    const normalizedStatus = (status || "").toLowerCase();

    if (!["approved", "rejected"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }

    const professional = await UserModel.findOne({
      _id: req.params.id,
      role: "PROFESSIONAL",
    });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional not found",
      });
    }

    if (normalizedStatus === "approved") {
      professional.professionalStatus = "approved";
      professional.rejectionReason = undefined;
    } else {
      professional.professionalStatus = "rejected";
      professional.rejectionReason = rejectionReason || verificationNotes || "Application requirements not met.";
    }

    if (verificationNotes) {
      professional.verificationNotes = verificationNotes;
    }

    await professional.save();

    const isApproved = normalizedStatus === "approved";
    const subject = isApproved
      ? "PoseFit Professional Account Approved & Live"
      : "PoseFit Professional Application Update";

    const text = isApproved
      ? `Hi ${professional.firstName} ${professional.lastName},

Great news! Your professional application has been reviewed and approved by the PoseFit Admin team.

You are now LIVE and BOOKABLE on PoseFit.

Regards,
PoseFit Team`
      : `Hi ${professional.firstName} ${professional.lastName},

Unfortunately, your professional application was not approved at this time.

Reason: ${professional.rejectionReason}

You may log in to your account, update your submitted information/documents, and resubmit for verification.

Regards,
PoseFit Team`;

    try {
      await transporter.sendMail({
        from: process.env.USER_EMAIL,
        to: professional.email,
        subject,
        text,
      });
    } catch (emailErr) {
      console.error("Failed to send status update email:", emailErr);
    }

    return res.status(200).json({
      success: true,
      message: isApproved
        ? "Professional approved & set to live/bookable successfully"
        : "Professional rejected successfully with rejection reason saved",
      professional: {
        _id: professional._id,
        firstName: professional.firstName,
        lastName: professional.lastName,
        email: professional.email,
        professionalStatus: professional.professionalStatus,
        rejectionReason: professional.rejectionReason,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update professional status",
      error: error.message,
    });
  }
};

// 14. Change admin password
const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const admin = await UserModel.findOne({
      _id: req.user.userId,
      role: "ADMIN",
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      admin.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      admin.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different",
      });
    }

    admin.password = await bcrypt.hash(newPassword, 10);

    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Admin password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to change admin password",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  userDetails,
  deleteUser,
  updateUser,
  getStats,
  getProfessionals,
  addProfessional,
  deleteProfessional,
  getAnalytics,
  getPendingProfessionals,
  updateProfessionalStatus,
  changeAdminPassword,
};
