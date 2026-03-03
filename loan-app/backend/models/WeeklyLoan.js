const mongoose = require("mongoose");

const weeklyLoanSchema = new mongoose.Schema(
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
    disbursementAmount: {
      type: Number,
      required: [true, "Disbursement amount is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    totalEmis: {
      type: Number,
      required: [true, "Total EMIs is required"],
    },
    emiAmount: {
      type: Number,
    },
    paidEmis: {
      type: Number,
      default: 0,
    },
    remainingEmis: {
      type: Number,
    },
    totalAmount: {
      type: Number,
      comment: "Total amount paid (emiAmount * paidEmis)",
    },
    nextEmiDate: {
      type: Date,
    },
    processingFee: {
      type: Number,
    },
    totalCollected: {
      type: Number,
      comment: "totalAmount + processingFee",
    },
    status: {
      type: String,
      enum: ["Active", "Closed", "Pending"],
      default: "Active",
    },
    nextFollowUpDate: {
      type: Date,
    },
    remarks: {
      type: String,
      trim: true,
    },
    clientResponse: {
      type: String,
      trim: true,
    },
    processingFeeRate: {
      type: Number,
      default: 10,
    },
    interestRate: {
      type: Number,
      default: 0,
    },
    emiStartDate: {
      type: Date,
    },
    emiEndDate: {
      type: Date,
    },
    totalInterestAmount: {
      type: Number,
      default: 0,
    },
    remainingPrincipalAmount: {
      type: Number,
    },
    expenses: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      default: "Weekly",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Pre-save middleware to handle calculations if needed, though we'll likely do them in the controller
weeklyLoanSchema.pre("save", async function () {
  if (this.disbursementAmount && this.totalEmis) {
    this.emiAmount = this.disbursementAmount / this.totalEmis;
    this.processingFee = this.disbursementAmount * 0.1;
    this.remainingEmis = this.totalEmis - this.paidEmis;
    this.totalAmount = this.emiAmount * this.paidEmis;
    this.totalCollected = this.totalAmount + this.processingFee;
  }
});

module.exports = mongoose.model("WeeklyLoan", weeklyLoanSchema);
