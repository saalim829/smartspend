require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db.js");
const authRoutes = require("./routes/authRoutes.js");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10kb" }));

app.use(express.urlencoded({ extended: false, limit: "10kb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SmartSpend API is running.",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the SmartSpend API.",
    healthCheck: "/api/health",
    authentication: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      profile: "GET /api/auth/me",
    },
  });
})

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
    method: req.method,
  });
});

app.use((error, req, res, next) => {
  console.error("API error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.status || error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : error.message || "Internal server error.",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("----------------------------------------");
      console.log("       SmartSpend API Started");
      console.log("----------------------------------------");
      console.log(`Server:      http://localhost:${PORT}`);
      console.log(`Health:      http://localhost:${PORT}/api/health`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("----------------------------------------");
    });
  } catch (error) {
    console.error("SmartSpend startup failed:", error.message);
    process.exit(1);
  }
};

startServer();