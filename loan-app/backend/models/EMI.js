const mongoose = require("mongoose");

const emiSchema = new mongoose.Schema(
  {
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
      required: true,
    },
    loanNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    emiNumber: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    emiAmount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    paymentMode: {
      type: String,
      default: "",
    },
    paymentDate: {
      type: Date,
    },
    overdue: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Partially Paid", "Overdue"],
      default: "Pending",
    },
    remarks: {
      type: String,
      trim: true,
    },
    paymentHistory: [
      {
        amount: { type: Number, required: true },
        mode: { type: String, required: true },
        date: { type: Date, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("EMI", emiSchema);
