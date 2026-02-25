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
    mobileNumbers: {
      type: [String],
      required: [true, "At least one customer mobile number is required"],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one customer mobile number is required",
      },
    },
    guarantorName: {
      type: String,
      trim: true,
    },
    guarantorMobileNumbers: {
      type: [String],
      required: [true, "At least one guarantor mobile number is required"],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one guarantor mobile number is required",
      },
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
      default: 0,
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
    seizedDate: {
      type: Date,
    },
    seizedStatus: {
      type: String,
      enum: ["For Seizing", "Seized", "Sold", "Re-activate"],
      default: "For Seizing",
    },
    remarks: {
      type: String,
      trim: true,
    },
    clientResponse: {
      type: String,
      trim: true,
    },
    nextFollowUpDate: {
      type: Date,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["Active", "Closed", "Seized"],
        message: "Please select a valid status",
      },
      default: "Active",
      trim: true,
    },
    paymentStatus: {
      type: String,
      default: "Pending",
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    foreclosedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
    },
    foreclosureDate: {
      type: Date,
    },
    foreclosureAmount: {
      type: Number,
    },
    foreclosureChargeAmount: {
      type: Number,
      default: 0,
    },
    foreclosureChargePercent: {
      type: Number,
      default: 0,
    },
    miscellaneousFee: {
      type: Number,
      default: 0,
    },
    odAmount: {
      type: Number,
      default: 0,
    },
    remainingPrincipal: {
      type: Number,
      default: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    soldDetails: {
      sellAmount: {
        type: Number,
      },
      miscellaneousAmount: {
        type: Number,
        default: 0,
      },
      totalAmount: {
        type: Number,
      },
      soldDate: {
        type: Date,
      },
      soldBy: {
        type: mongoose.Schema.Types.Mixed,
        ref: "User",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Loan", loanSchema);
