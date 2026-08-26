const mongoose = require("mongoose");

const ConnectToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("mongodb connected successfully");
  } catch (error) {
    console.log("server error", error);
  }
};

module.exports = ConnectToDB;