const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    siNo: {
      type: String,
      trim: true,
    },
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
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    ownRent: {
      type: String,
      enum: ["Own", "Rent"],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
    },
    additionalMobileNumbers: {
      type: [String],
      default: [],
    },
    guarantorName: {
      type: String,
      trim: true,
    },
    guarantorMobileNumbers: {
      type: [String],
      default: [],
    },
    panNumber: {
      type: String,
      trim: true,
    },
    aadharNumber: {
      type: String,
      trim: true,
    },
    principalAmount: {
      type: Number,
      required: [true, "Principal amount is required"],
    },
    processingFeeRate: {
      type: Number,
    },
    processingFee: {
      type: Number,
    },
    tenureType: {
      type: String,
      default: "Monthly",
    },
    tenureMonths: {
      type: Number,
      required: [true, "Tenure in months is required"],
    },
    annualInterestRate: {
      type: Number,
      required: [true, "Annual interest rate is required"],
    },
    dateLoanDisbursed: {
      type: Date,
    },
    emiStartDate: {
      type: Date,
    },
    emiEndDate: {
      type: Date,
    },
    monthlyEMI: {
      type: Number,
    },
    totalInterestAmount: {
      type: Number,
    },
    vehicleNumber: {
      type: String,
      trim: true,
    },
    chassisNumber: {
      type: String,
      trim: true,
    },
    engineNumber: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    typeOfVehicle: {
      type: String,
      trim: true,
    },
    ywBoard: {
      type: String,
      trim: true,
    },
    docChecklist: {
      type: String,
      trim: true,
    },
    dealerName: {
      type: String,
      trim: true,
    },
    dealerNumber: {
      type: String,
      trim: true,
    },
    hpEntry: {
      type: String,
      default: "Not done",
      trim: true,
    },
    fcDate: {
      type: Date,
    },
    insuranceDate: {
      type: Date,
    },
    rtoWorkPending: {
      type: [String],
      default: [],
    },
    isSeized: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Loan", loanSchema);
