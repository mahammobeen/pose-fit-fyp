const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const ConnectToDB = require("../models/db");
const UserModel = require("../models/userModel");

dotenv.config();

const createAdmin = async () => {
  try {
    await ConnectToDB();

    const email = "admin@posefit.com";
    const password = "Admin@123";

    const existingAdmin = await UserModel.findOne({
      email,
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await UserModel.create({
      firstName: "PoseFit",
      lastName: "Admin",
      email,
      password: hashedPassword,
      role: "ADMIN",
      isVerified: true,
    });

    console.log("Admin created successfully");
    console.log("Email:", email);
    console.log("Password:", password);

    process.exit(0);
  } catch (error) {
    console.error("Admin creation error:", error);
    process.exit(1);
  }
};

createAdmin();