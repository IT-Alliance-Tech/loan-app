const express = require("express");
// Triggering server restart for debugging
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const errorMiddleware = require("./middlewares/error");
const authRoutes = require("./routes/authroutes");
const userRoutes = require("./routes/userroutes");
const loanRoutes = require("./routes/loanRoutes");
const customerRoutes = require("./routes/customerroutes");
const emiUtilityRoutes = require("./routes/emiUtilityRoutes");

dotenv.config();

const app = express();

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

// Error Middleware
app.use(errorMiddleware);

module.exports = app;
