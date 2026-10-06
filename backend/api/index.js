const app = require("../server");
const ConnectToDB = require("../models/db");

let dbPromise;

const handler = async (req, res) => {
  try {
    if (!dbPromise) {
      dbPromise = ConnectToDB();
    }

    await dbPromise;

    return app(req, res);
  } catch (error) {
    console.error("Database connection error:", error);

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
};

module.exports = handler;