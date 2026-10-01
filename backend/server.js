const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth/authRoutes");
const adminRoutes = require("./routes/admin/adminRoutes");
const paymentRoutes = require("./routes/payment/paymentRoutes");
const reviewRoutes = require("./routes/review/reviewRoutes");
const professionalRoutes = require("./routes/professional/professionalRoutes");
const uploadRoutes = require("./routes/upload/uploadRoutes");
const userRoutes = require("./routes/user/userRoutes");
const googleRoutes = require("./routes/google/googleRoutes");

const { stripeWebhook } = require("./controllers/payment/paymentController");
const { startBookingReminderScheduler } = require("./services/bookingReminderService");
const ConnectToDB = require("./models/db");

const app = express();

const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/professional", professionalRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/user", userRoutes);
app.use("/api/google", googleRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PoseFit Backend API is running",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

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
