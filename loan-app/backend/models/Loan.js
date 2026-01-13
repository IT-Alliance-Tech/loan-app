const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    loanNumber: {
      type: String,
      required: [true, "Loan number is required"],
      unique: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
    },
    alternateMobile: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    principalAmount: {
      type: Number,
      required: [true, "Principal amount is required"],
    },
    annualInterestRate: {
      type: Number,
      required: [true, "Annual interest rate is required"],
    },
    tenureMonths: {
      type: Number,
      required: [true, "Tenure in months is required"],
    },
    monthlyEMI: {
      type: Number,
    },
    loanStartDate: {
      type: Date,
      required: [true, "Loan start date is required"],
    },
    isSeized: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Loan", loanSchema);
