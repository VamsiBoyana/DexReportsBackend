const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const mainRoutes = require("./routes/mainRoutes");
const adminRoutes = require("./routes/adminRoutes");

const dotenv = require("dotenv");
// Determine environment and load appropriate .env file
const env = process.env.NODE_ENV || "development";
console.log(`\n✅ Running in ${env} mode\n`);
 
if (env === "production") {
  dotenv.config({ path: ".env.production", override: true });
} else {
  dotenv.config({ path: ".env", override: true });
}

// Connect to database
connectDB();

const app = express();

// Set port based on environment
const PORT = process.env.PORT || (env === "production" ? 5000 : 3000);

// Get frontend URL from environment variable
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// CORS configuration - Allow frontend origin from environment variable
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-token"],
  })
);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use("/api/v1/main", mainRoutes);

app.use('/api/admin', adminRoutes);

// Basic routes
app.get("/", (req, res) => {
  res.json({
    message: "DEX Backend API",
    environment: env,
    port: PORT,
    status: "Server is running",
    version: "1.0.0",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    environment: env,
    timestamp: new Date().toISOString(),
    database: "Connected",
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: "Route not found",
    environment: env,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err.stack);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      message: err.message,
      details: err.errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      error: "Duplicate Entry",
      message: "Data already exists",
      field: Object.keys(err.keyValue)[0],
    });
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid Token",
      message: "Authentication token is invalid",
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: "Server Error",
    message: err.message,
    ...(env === "development" && { stack: err.stack }),
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running in ${env} mode on port ${PORT}`);
  console.log(`Frontend: ${FRONTEND_URL}`);
  // console.log(`Backend API: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

module.exports = app;
