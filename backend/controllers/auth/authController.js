const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const UserModel = require("../../models/userModel");
const generateToken = require("../../utils/token");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (role && role.toUpperCase() === "PROFESSIONAL") {
      return res.status(403).json({
        success: false,
        message:
          "Direct public registration for Professionals is not allowed. Please contact the PoseFit admin team to get onboarded.",
      });
    }

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await UserModel.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    const newUser = new UserModel({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "USER",
      isVerified: false,
      verificationCode,
      verificationCodeExpires,
    });

    await newUser.save();
    await transporter.sendMail({
      from: `"PoseFit" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "PoseFit Email Verification",
      text:
        `Hi ${firstName} ${lastName},\n\n` +
        `Your PoseFit verification code is: ${verificationCode}\n\n` +
        `This verification code will expire in 15 minutes.\n\n` +
        `Please use this code to verify your email.`,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. Verification code sent to your email.",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during registration",
      error: error.message,
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        message: "User ID and verification code are required",
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    if (
      user.verificationCode !== code.toString() ||
      !user.verificationCodeExpires ||
      user.verificationCodeExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Verification code is invalid or has expired",
      });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify email error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while verifying email",
      error: error.message,
    });
  }
};

const resendVerificationCode = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;

    await user.save();

    await transporter.sendMail({
      from: `"PoseFit" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "PoseFit Email Verification",
      text:
        `Hi ${user.firstName} ${user.lastName},\n\n` +
        `Your new PoseFit verification code is: ${verificationCode}\n\n` +
        `This verification code will expire in 15 minutes.\n\n` +
        `Please use this code to verify your email.`,
    });

    return res.status(200).json({
      success: true,
      message: "A new verification code has been sent to your email",
    });
  } catch (error) {
    console.error("Resend verification code error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while resending verification code",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await UserModel.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist",
      });
    }

    if (user.role === "USER" && !user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id.toString(), user.role, {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      professionalType: user.professionalType,
      professionalStatus: user.professionalStatus,
    });

    const userData = user.toObject();

    delete userData.password;
    delete userData.verificationCode;
    delete userData.verificationCodeExpires;
    delete userData.resetPasswordToken;
    delete userData.resetPasswordTokenExpires;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during login",
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const isExisted = await UserModel.findOne({
      email: email.toLowerCase(),
    });

    if (!isExisted) {
      return res.status(400).json({
        success: false,
        message: "Email does not exist",
      });
    }

    const resetPasswordToken = crypto.randomBytes(32).toString("hex");

    const resetPasswordTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    isExisted.resetPasswordToken = resetPasswordToken;
    isExisted.resetPasswordTokenExpires = resetPasswordTokenExpires;

    await isExisted.save();

    const resetLink = `http://localhost:5173/reset-password?token=${encodeURIComponent(
      resetPasswordToken,
    )}`;

    await transporter.sendMail({
      from: `"PoseFit" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your PoseFit Password",

      text: `Hi ${isExisted.firstName} ${isExisted.lastName},

We received a request to reset your PoseFit password.

Please click the link below to create a new password:

${resetLink}

IMPORTANT:
This password reset link will expire in 15 minutes.

If you did not request a password reset, please ignore this email.

Regards,
PoseFit Team`,

      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f7;
      margin: 0;
      padding: 0;
    }

    .container {
      max-width: 600px;
      margin: 50px auto;
      background-color: #ffffff;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .header {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      color: #333333;
      margin-bottom: 20px;
    }

    .content {
      font-size: 16px;
      color: #555555;
      line-height: 1.5;
      margin-bottom: 30px;
    }

    .button {
      display: inline-block;
      padding: 12px 25px;
      font-size: 16px;
      color: #ffffff;
      background-color: #4f46e5;
      border-radius: 5px;
      text-decoration: none;
    }

    .footer {
      font-size: 12px;
      color: #999999;
      text-align: center;
      margin-top: 20px;
    }

    .content a {
      color: #ffffff;
    }

    .footer a {
      color: #4f46e5;
      text-decoration: none;
      word-break: break-all;
    }

    .expiry {
      font-weight: bold;
      color: #d9534f;
    }
  </style>
</head>

<body>

  <div class="container">

    <div class="header">
      Reset Your Password
    </div>

    <div class="content">

      Hi ${isExisted.firstName} ${isExisted.lastName},
      <br><br>

      We received a request to reset your PoseFit password.
      Click the button below to create a new password.
      <br><br>

      <a
        href="${resetLink}"
        class="button"
      >
        Reset Password
      </a>

      <br><br>

      <span class="expiry">
        This password reset link will expire in 15 minutes.
      </span>

      <br><br>

      If you did not request a password reset, please ignore this email.

    </div>

    <div class="footer">

      &copy; 2026 PoseFit. All rights reserved.
      <br><br>

      If you're having trouble clicking the button, copy and paste this link
      into your browser:

      <br><br>

      <a href="${resetLink}">
        ${resetLink}
      </a>

    </div>

  </div>

</body>
</html>`,
    });

    return res.status(200).json({
      success: true,
      message:
        "We have sent a password reset link to your email address. Please check your email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = req.query.token || req.body.token || req.params.token;

    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Reset token or password is missing",
      });
    }

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpires: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset link is invalid or has expired",
      });
    }

    const isSamePassword = await bcrypt.compare(password, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from old password",
      });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    user.password = encryptedPassword;

    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const completeProfessionalProfile = async (req, res) => {
  try {
    const professionalId = req.user.userId;

    const professional = await UserModel.findOne({
      _id: professionalId,
      role: "PROFESSIONAL",
    });

    if (!professional) {
      return res.status(404).json({
        success: false,
        message: "Professional not found or unauthorized",
      });
    }

    const {
      profilePhoto,
      bio,
      specialization,
      experience,
      sessionFee,
      credentialDocs,
      // bankDetails,
      availability,
    } = req.body;

    if (profilePhoto) {
      professional.profilePhoto = profilePhoto;
    }

    if (bio) {
      professional.bio = bio;
    }

    if (specialization) {
      professional.specialization = specialization;
    }

    if (experience !== undefined) {
      professional.experience = Number(experience);
    }

    if (sessionFee !== undefined) {
      professional.sessionFee = Number(sessionFee);
    }

    if (credentialDocs) {
      professional.credentialDocs = credentialDocs;
    }

    // if (bankDetails) {
    //   professional.bankDetails = bankDetails;
    // }

    if (availability) {
      professional.availability = availability;
    }
    professional.professionalStatus = "pending_verification";
    professional.rejectionReason = undefined;
    professional.appliedAt = new Date();

    await professional.save();

    const result = professional.toObject();

    delete result.password;

    return res.status(200).json({
      success: true,
      message: "Professional profile submitted for verification successfully",
      professional: result,
    });
  } catch (error) {
    console.error("Error in completeProfessionalProfile:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while completing professional profile",
      error: error.message,
    });
  }
};

module.exports = {
  signup,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  resendVerificationCode,
  completeProfessionalProfile,
};