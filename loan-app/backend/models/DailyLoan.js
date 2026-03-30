const mongoose = require("mongoose");

const dailyLoanSchema = new mongoose.Schema(
  {
    loanNumber: {
      type: String,
      required: [true, "Loan number is required"],
      unique: true,
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
    },
    mobileNumbers: {
      type: [String],
    },
    guarantorName: {
      type: String,
      trim: true,
    },
    guarantorMobileNumbers: {
      type: [String],
    },
    disbursementAmount: {
      type: Number,
    },
    startDate: {
      type: Date,
    },
    dateLoanDisbursed: {
      type: Date,
    },
    totalEmis: {
      type: Number,
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
    },
    nextEmiDate: {
      type: Date,
    },
    processingFee: {
      type: Number,
    },
    totalCollected: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["Active", "Closed", "Pending", "Seized"],
      default: "Active",
    },
    nextFollowUpDate: {
      type: Date,
    },
    odAmount: {
      type: Number,
      default: 0,
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
      default: "Daily",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for Seized Vehicle details
dailyLoanSchema.virtual("seizedDetails", {
  ref: "SeizedVehicle",
  localField: "_id",
  foreignField: "loanId",
  justOne: true,
});

// Virtual for Closure details
dailyLoanSchema.virtual("closureDetails", {
  ref: "ClosedLoan",
  localField: "_id",
  foreignField: "loanId",
  justOne: true,
});

// Virtual for Follow-up history
dailyLoanSchema.virtual("followupHistory", {
  ref: "Followup",
  localField: "_id",
  foreignField: "loanId",
});

// Pre-save middleware to handle calculations
dailyLoanSchema.pre("save", async function () {
  if (this.disbursementAmount && this.totalEmis) {
    this.emiAmount = Math.ceil(this.disbursementAmount / this.totalEmis);
    this.processingFee =
      this.disbursementAmount * (this.processingFeeRate / 100);
    this.remainingEmis = this.totalEmis - this.paidEmis;
    this.totalAmount = this.emiAmount * this.paidEmis;
    this.totalCollected = this.totalAmount + this.processingFee;
  }
});

// Indexes for analytics and faster searching
dailyLoanSchema.index({ status: 1 });
dailyLoanSchema.index({ disbursementAmount: 1 });
dailyLoanSchema.index({ totalAmount: 1 });
dailyLoanSchema.index({ paidEmis: 1 });
dailyLoanSchema.index({ remainingEmis: 1 });

module.exports = mongoose.model("DailyLoan", dailyLoanSchema);
