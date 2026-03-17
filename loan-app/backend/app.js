const express = require("express");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const errorMiddleware = require("./middlewares/error");
const authRoutes = require("./routes/authroutes");
const userRoutes = require("./routes/userroutes");
const loanRoutes = require("./routes/loanRoutes");
const customerRoutes = require("./routes/customerroutes");
const emiUtilityRoutes = require("./routes/emiUtilityRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const weeklyLoanRoutes = require("./routes/weeklyLoanRoutes");
const dailyLoanRoutes = require("./routes/dailyLoanRoutes");
const loanEmiRoutes = require("./routes/loanEmiRoutes");
const todoRoutes = require("./routes/todoRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const compression = require("compression");

const app = express();

// 1. Performance Monitoring Middleware (Global)
app.use((req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    const duration = (performance.now() - start).toFixed(2);
    console.log(`[PERF] ${req.method} ${req.originalUrl} - ${duration}ms`);
  });
  next();
});

// 2. Global Compression
app.use(compression());

// Health Check & Root
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is healthy" });
});

app.get("/", (req, res) => {
  res.status(200).send("Loan App Backend is running");
});

// Trust proxy for secure cookies in production
app.set("trust proxy", 1);

// Allow multiple origins for CORS
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",")
  : [
      "http://localhost:3000",
      "https://loan-application.italliancetech.com",
      "https://loanapp-dev.vercel.app",
    ];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/emi-utility", emiUtilityRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/weekly-loans", weeklyLoanRoutes);
app.use("/api/daily-loans", dailyLoanRoutes);
app.use("/api/emi-mgmt", loanEmiRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/collections", collectionRoutes);

// Error Middleware
app.use(errorMiddleware);

module.exports = app;
