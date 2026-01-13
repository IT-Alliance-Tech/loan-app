const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const errorMiddleware = require("./middlewares/error.middleware");
const authRoutes = require("./routes/authroutes");
const userRoutes = require("./routes/userroutes");
const loanRoutes = require("./routes/loanRoutes");
const customerRoutes = require("./routes/customerroutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/customers", customerRoutes);

// Error Middleware
app.use(errorMiddleware);

module.exports = app;
