const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth/authRoutes");
const adminRoutes = require("./routes/admin/adminRoutes");
const paymentRoutes = require("./routes/payment/paymentRoutes");
const reviewRoutes = require("./routes/review/reviewRoutes");
const professionalRoutes = require("./routes/professional/professionalRoutes");
const uploadRoutes = require("./routes/upload/uploadRoutes");
const userRoutes = require("./routes/user/userRoutes");
const googleRoutes = require("./routes/google/googleRoutes");


const { stripeWebhook } = require("./controllers/payment/paymentController");
const {
  startBookingReminderScheduler,
} = require("./services/bookingReminderService");
const ConnectToDB = require("./models/db");

const app = express();

const PORT = process.env.PORT || 4000;

// UPLOADS DIRECTORY
const uploadsPath = path.join(__dirname, "uploads");
const photosPath = path.join(uploadsPath, "photos");
const documentsPath = path.join(uploadsPath, "documents");

if (!fs.existsSync(photosPath)) {
  fs.mkdirSync(photosPath, { recursive: true });
}

if (!fs.existsSync(documentsPath)) {
  fs.mkdirSync(documentsPath, { recursive: true });
}

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// STRIPE WEBHOOK
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

// BODY PARSER
app.use(express.json());

// STATIC UPLOADS
app.use("/uploads", express.static(uploadsPath));

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/professional", professionalRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/user", userRoutes);
app.use("/api/google", googleRoutes);

// ROOT
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PoseFit Backend API is running",
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// START SERVER
const startServer = async () => {
  try {
    await ConnectToDB();

    app.listen(PORT, () => {
      console.log(`PoseFit Backend running on port ${PORT}`);
      startBookingReminderScheduler();
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

startServer();
