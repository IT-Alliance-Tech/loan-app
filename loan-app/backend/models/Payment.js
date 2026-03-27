const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    emiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EMI",
      required: false,
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "loanModel",
    },
    loanModel: {
      type: String,
      required: true,
      enum: ["Loan", "WeeklyLoan", "DailyLoan"],
    },
    amount: {
      type: Number,
      required: true,
    },
    overdueAmount: {
      type: Number,
      default: 0,
    },
    mode: {
      type: String,
      required: true,
      default: "CASH",
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentType: {
      type: String,
      enum: ["Monthly", "Daily", "Weekly", "Processing Fee", "Overdue"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Partial", "Pending", "Success"],
      default: "Success",
    },
    remarks: {
      type: String,
      trim: true,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
