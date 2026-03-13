const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const EMI = require("../models/EMI");
const SeizedVehicle = require("../models/SeizedVehicle");
const ClosedLoan = require("../models/ClosedLoan");
const Followup = require("../models/Followup");
const DailyLoan = require("../models/DailyLoan");
const WeeklyLoan = require("../models/WeeklyLoan");
const Payment = require("../models/Payment");
const ErrorHandler = require("../utils/ErrorHandler");
const { addMonths } = require("date-fns");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { formatLoanResponse } = require("../utils/loanFormatter");

const calculateEMI = (principal, roi, tenureMonths) => {
  const p = parseFloat(principal);
  const r = parseFloat(roi);
  const n = parseInt(tenureMonths);
  if (!p || !n) return 0;

  // Flat Interest Calculation: EMI = (Principal / Tenure) + (Principal * Rate / 100)
  const monthlyInterest = p * (r / 100);
  const monthlyPrincipal = p / n;
  const emi = monthlyPrincipal + monthlyInterest;

  return Math.ceil(emi);
};

const calculateEMIApi = asyncHandler(async (req, res, next) => {
  const { principalAmount, annualInterestRate, tenureMonths } = req.body;

  if (!principalAmount || !annualInterestRate || !tenureMonths) {
    return next(
      new ErrorHandler("Please provide principal, rate and tenure", 400),
    );
  }

  const emi = calculateEMI(principalAmount, annualInterestRate, tenureMonths);

  sendResponse(res, 200, "success", "EMI calculated successfully", null, {
    emi,
  });
});

const createLoan = asyncHandler(async (req, res, next) => {
  const {
    customerDetails,
    loanTerms,
    vehicleInformation,
    status: statusObj,
  } = req.body;

  if (
    !loanTerms?.loanNumber ||
    !customerDetails?.customerName ||
    !customerDetails?.mobileNumbers ||
    customerDetails.mobileNumbers.length === 0 ||
    !loanTerms?.principalAmount ||
    !loanTerms?.annualInterestRate ||
    !loanTerms?.tenureMonths
  ) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  const existingLoan = await Loan.findOne({
    loanNumber: loanTerms.loanNumber,
  });
  if (existingLoan) {
    return next(new ErrorHandler("Loan number already exists", 400));
  }

  const monthlyEMI = calculateEMI(
    loanTerms.principalAmount,
    loanTerms.annualInterestRate,
    loanTerms.tenureMonths,
  );

  const calculatedTotalInterest =
    parseFloat(loanTerms.principalAmount) *
    (parseFloat(loanTerms.annualInterestRate) / 100) *
    parseInt(loanTerms.tenureMonths);

  const loan = await Loan.create({
    // customerDetails
    customerName: customerDetails.customerName,
    address: customerDetails.address,
    ownRent: customerDetails.ownRent,
    mobileNumbers: customerDetails.mobileNumbers,
    panNumber: customerDetails.panNumber,
    aadharNumber: customerDetails.aadharNumber,
    guarantorName: customerDetails.guarantorName,
    guarantorMobileNumbers: customerDetails.guarantorMobileNumbers,

    // loanTerms
    loanNumber: loanTerms.loanNumber,
    principalAmount: loanTerms.principalAmount,
    processingFeeRate: loanTerms.processingFeeRate,
    processingFee: loanTerms.processingFee,
    tenureMonths: loanTerms.tenureMonths,
    annualInterestRate: loanTerms.annualInterestRate,
    dateLoanDisbursed: loanTerms.dateLoanDisbursed,
    emiStartDate: loanTerms.emiStartDate,
    emiEndDate: loanTerms.emiEndDate,
    monthlyEMI,
    totalInterestAmount: calculatedTotalInterest,

    // vehicleInformation
    vehicleNumber: vehicleInformation?.vehicleNumber,
    chassisNumber: vehicleInformation?.chassisNumber,
    engineNumber: vehicleInformation?.engineNumber,
    modelYear: vehicleInformation?.modelYear,
    typeOfVehicle: vehicleInformation?.typeOfVehicle,
    ywBoard: vehicleInformation?.ywBoard,
    dealerName: vehicleInformation?.dealerName,
    dealerNumber: vehicleInformation?.dealerNumber,
    fcDate: vehicleInformation?.fcDate,
    insuranceDate: vehicleInformation?.insuranceDate,
    rtoWorkPending: vehicleInformation?.rtoWorkPending,
    hpEntry: vehicleInformation?.hpEntry || "Not done",

    // status
    status: statusObj?.status || "Active",
    paymentStatus: statusObj?.paymentStatus || "Pending",
    docChecklist: statusObj?.docChecklist,
    remarks: statusObj?.remarks,
    clientResponse: statusObj?.clientResponse,
    nextFollowUpDate: statusObj?.nextFollowUpDate,
    createdBy: req.user._id,
  });

  // Generate EMIs
  const emis = [];
  let currentEmiDate = new Date(
    loan.emiStartDate || loan.dateLoanDisbursed || new Date(),
  );

  for (let i = 1; i <= loanTerms.tenureMonths; i++) {
    emis.push({
      loanId: loan._id,
      loanNumber: loan.loanNumber,
      customerName: loan.customerName,
      emiNumber: i,
      dueDate: addMonths(new Date(currentEmiDate), i - 1),
      emiAmount: monthlyEMI,
      status: "Pending",
    });
  }

  await EMI.insertMany(emis);

  sendResponse(
    res,
    201,
    "success",
    "Loan created and EMIs generated successfully",
    null,
    formatLoanResponse(loan),
  );
});

const getAllLoans = asyncHandler(async (req, res, next) => {
  const startTotal = performance.now();
  const {
    loanNumber,
    customerName,
    mobileNumber,
    vehicleNumber,
    tenureMonths,
    status,
  } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12; // Increased slightly for UI density
  const skip = (page - 1) * limit;

  const query = {};

  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (vehicleNumber)
    query.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
  if (mobileNumber) {
    query.$or = [
      { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
      { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
    ];
  }
  if (tenureMonths) query.tenureMonths = tenureMonths;
  if (status) {
    const statusLower = status.toLowerCase();
    if (statusLower === "seized") {
      query.isSeized = true;
    } else if (statusLower === "active") {
      query.status = { $regex: /^active$/i };
      query.isSeized = { $ne: true };
    } else {
      query.status = { $regex: new RegExp(`^${status}$`, "i") };
    }
  }

  // Handle Expired Loans filter
  if (req.query.isExpired === "true") {
    query.status = { $regex: /^active$/i };
    query.emiEndDate = { $lt: new Date() };
  }

  // 1. Performance: Count documents (Fast)
  const countStart = performance.now();
  const total = await Loan.countDocuments(query);
  const countTime = (performance.now() - countStart).toFixed(2);

  // Check if we need extended data for export
  const forExport = req.query.forExport === "true";

  let loans;
  const dbStart = performance.now();
  if (forExport) {
    // Advanced aggregation for export with repayment stats
    loans = await Loan.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "emis",
          localField: "_id",
          foreignField: "loanId",
          as: "emis",
        },
      },
      {
        $addFields: {
          repaymentStats: {
            totalCollected: {
              $add: [
                { $sum: "$emis.amountPaid" },
                { $sum: { $ifNull: ["$emis.overdue", 0] } },
              ],
            },
            overdueAmount: { $sum: "$emis.overdue" },
            paidEmisCount: {
              $size: {
                $filter: {
                  input: "$emis",
                  as: "emi",
                  cond: { $eq: ["$$emi.status", "Paid"] },
                },
              },
            },
            remainingTenure: {
              $size: {
                $filter: {
                  input: "$emis",
                  as: "emi",
                  cond: { $ne: ["$$emi.status", "Paid"] },
                },
              },
            },
          },
        },
      },
      { $project: { emis: 0 } },
    ]);
  } else {
    // CRITICAL OPTIMIZATION: .lean() and .select()
    // We select ALL fields required by the frontend table to avoid undefined errors
    loans = await Loan.find(query)
      .select(
        "loanNumber customerName mobileNumbers guarantorName guarantorMobileNumbers monthlyEMI tenureMonths status isSeized clientResponse createdAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }
  const dbTime = (performance.now() - dbStart).toFixed(2);

  // 2. Performance: Serialization & Formatting
  const serStart = performance.now();
  const formattedLoans = loans.map((loan) => {
    // RESTORE NESTED STRUCTURE: Frontend expects these specific paths
    return {
      _id: loan._id,
      customerDetails: {
        customerName: loan.customerName,
        mobileNumbers: loan.mobileNumbers || [],
        guarantorName: loan.guarantorName,
        guarantorMobileNumbers: loan.guarantorMobileNumbers || [],
      },
      loanTerms: {
        loanNumber: loan.loanNumber,
        monthlyEMI: loan.monthlyEMI,
        tenureMonths: loan.tenureMonths,
      },
      status: {
        status: loan.status,
        isSeized: loan.isSeized,
        clientResponse: loan.clientResponse,
      },
      createdAt: loan.createdAt,
      repaymentStats: loan.repaymentStats || null,
    };
  });

  const responseData = {
    loans: formattedLoans,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    performance: {
      dbTime: `${dbTime}ms`,
      countTime: `${countTime}ms`,
      totalTime: `${(performance.now() - startTotal).toFixed(2)}ms`,
    },
  };

  const serTime = (performance.now() - serStart).toFixed(2);
  const totalTime = (performance.now() - startTotal).toFixed(2);

  console.log(
    `[PERF] getAllLoans - DB: ${dbTime}ms, Ser: ${serTime}ms, Total: ${totalTime}ms, Size: ${JSON.stringify(responseData).length} bytes`,
  );

  // Use the standard sendResponse utility to ensure status: "success" wrapper
  sendResponse(
    res,
    200,
    "success",
    "Loans fetched successfully",
    null,
    responseData,
  );
});

const populateLoanDetails = (query) => {
  return query
    .populate("createdBy", "name")
    .populate("foreclosedBy", "name")
    .populate("updatedBy", "name")
    .populate("soldDetails.soldBy", "name")
    .populate("seizedDetails")
    .populate("closureDetails")
    .populate("followupHistory");
};

const getLoanByLoanNumber = asyncHandler(async (req, res, next) => {
  const loan = await populateLoanDetails(
    Loan.findOne({ loanNumber: req.params.loanNumber }),
  );

  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Calculate remaining principal accurately including partial payments
  const emis = await EMI.find({ loanId: loan._id });
  let remainingTenureCount = 0;

  if (emis && emis.length > 0) {
    emis.forEach((emi) => {
      const emiAmount = parseFloat(emi.emiAmount) || 0;
      const amountPaid = parseFloat(emi.amountPaid) || 0;
      if (emiAmount > 0) {
        let remainingPortion = (emiAmount - amountPaid) / emiAmount;
        if (remainingPortion < 0) remainingPortion = 0;
        remainingTenureCount += remainingPortion;
      }
    });
  } else {
    remainingTenureCount = loan.tenureMonths || 0;
  }

  const principalPerMonth =
    (loan.principalAmount || 0) / (loan.tenureMonths || 1);
  const remainingPrincipalAmount = Math.max(
    0,
    remainingTenureCount * principalPerMonth,
  );

  const formattedLoan = formatLoanResponse(loan);
  formattedLoan.loanTerms.remainingPrincipalAmount = parseFloat(
    remainingPrincipalAmount.toFixed(2),
  );

  // Aggressive recovery logic for foreclosureDetails for older loans
  if (
    loan.status?.toLowerCase() === "closed" &&
    !loan.foreclosureAmount && // Trigger if 0, null, or undefined
    !loan.soldDetails?.sellAmount // Don't trigger if it's a sold vehicle
  ) {
    // 1. Search for explicit foreclosure/settlement EMI (using both ID and loanNumber)
    const foreclosureEmi = await EMI.findOne({
      $or: [{ loanId: loan._id }, { loanNumber: loan.loanNumber }],
      $or: [
        { paymentMode: { $regex: /foreclosure|settlement|closed/i } },
        { remarks: { $regex: /foreclosure|settlement|closed|final/i } },
      ],
    }).sort({ createdAt: -1 });

    // 2. Fallback to the absolute last paid EMI
    const targetEmi =
      foreclosureEmi ||
      (await EMI.findOne({
        $or: [{ loanId: loan._id }, { loanNumber: loan.loanNumber }],
        status: "Paid",
      }).sort({ dueDate: -1, createdAt: -1 }));

    if (targetEmi) {
      if (!formattedLoan.status.foreclosureDetails) {
        formattedLoan.status.foreclosureDetails = {};
      }

      if (targetEmi.remarks) {
        // Updated regex to prioritize currency symbols/terms and exclude date-like patterns
        const amtMatch =
          targetEmi.remarks.match(
            /(?:Amount|Settlement|₹|Rs\.?)\s*([\d,.]+)/i,
          ) ||
          targetEmi.remarks.match(/[₹]\s*([\d,.]+)/) ||
          targetEmi.remarks.match(/(?<![\/\d])\b([\d,.]+)(?!\s*[\/\d])/); // Avoid numbers surrounded by slashes (dates)
        if (amtMatch) {
          formattedLoan.status.foreclosureDetails.foreclosureAmount =
            parseFloat(amtMatch[1].replace(/,/g, ""));
        }
      }

      if (!formattedLoan.status.foreclosureDetails.foreclosureAmount) {
        formattedLoan.status.foreclosureDetails.foreclosureAmount =
          targetEmi.amountPaid || targetEmi.emiAmount;
      }

      formattedLoan.status.foreclosureDetails.foreclosureDate =
        targetEmi.paymentDate || targetEmi.createdAt;
    }

    // Final fallback for amount: check loan's own remarks
    if (
      !formattedLoan.status.foreclosureDetails?.foreclosureAmount &&
      loan.remarks
    ) {
      const loanAmtMatch =
        loan.remarks.match(/(?:Amount|Settlement|₹|Rs\.?)\s*([\d,.]+)/i) ||
        loan.remarks.match(/[₹]\s*([\d,.]+)/) ||
        loan.remarks.match(/(?<![\/\d])\b([\d,.]+)(?!\s*[\/\d])/);
      if (loanAmtMatch) {
        if (!formattedLoan.status.foreclosureDetails)
          formattedLoan.status.foreclosureDetails = {};
        formattedLoan.status.foreclosureDetails.foreclosureAmount = parseFloat(
          loanAmtMatch[1].replace(/,/g, ""),
        );
      }
    }

    // Processed By Fallback: Use creator if specific's processor is unknown
    if (
      !formattedLoan.status.foreclosureDetails?.foreclosedBy &&
      !loan.foreclosedBy
    ) {
      if (!formattedLoan.status.foreclosureDetails)
        formattedLoan.status.foreclosureDetails = {};
      formattedLoan.status.foreclosureDetails.foreclosedBy =
        loan.createdBy?.name || "System";
    }

    // Ensure we ALWAYS have a date for closed loans (using updatedAt as absolute fallback)
    if (!formattedLoan.status.foreclosureDetails?.foreclosureDate) {
      if (!formattedLoan.status.foreclosureDetails)
        formattedLoan.status.foreclosureDetails = {};
      formattedLoan.status.foreclosureDetails.foreclosureDate =
        loan.foreclosureDate || loan.updatedAt;
    }
  }

  sendResponse(res, 200, "success", "Loan found", null, formattedLoan);
});

const getLoanById = asyncHandler(async (req, res, next) => {
  if (
    !mongoose.Types.ObjectId.isValid(req.params.id) ||
    req.params.id === "undefined"
  ) {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }
  const loan = await populateLoanDetails(Loan.findById(req.params.id));
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Calculate remaining principal accurately including partial payments
  const emis = await EMI.find({ loanId: loan._id });
  let remainingTenureCount = 0;

  if (emis && emis.length > 0) {
    emis.forEach((emi) => {
      const emiAmount = parseFloat(emi.emiAmount) || 0;
      const amountPaid = parseFloat(emi.amountPaid) || 0;
      if (emiAmount > 0) {
        let remainingPortion = (emiAmount - amountPaid) / emiAmount;
        if (remainingPortion < 0) remainingPortion = 0;
        remainingTenureCount += remainingPortion;
      }
    });
  } else {
    remainingTenureCount = loan.tenureMonths || 0;
  }

  const principalPerMonth =
    (loan.principalAmount || 0) / (loan.tenureMonths || 1);
  const remainingPrincipalAmount = Math.max(
    0,
    remainingTenureCount * principalPerMonth,
  );

  const formattedLoan = formatLoanResponse(loan);
  formattedLoan.loanTerms.remainingPrincipalAmount = parseFloat(
    remainingPrincipalAmount.toFixed(2),
  );

  // Aggressive recovery logic for foreclosureDetails for older loans
  if (
    loan.status?.toLowerCase() === "closed" &&
    !loan.foreclosureAmount && // Trigger if 0, null, or undefined
    !loan.soldDetails?.sellAmount // Don't trigger if it's a sold vehicle
  ) {
    // 1. Search for explicit foreclosure/settlement EMI
    const foreclosureEmi = await EMI.findOne({
      $or: [{ loanId: loan._id }, { loanNumber: loan.loanNumber }],
      $or: [
        { paymentMode: { $regex: /foreclosure|settlement|closed/i } },
        { remarks: { $regex: /foreclosure|settlement|closed|final/i } },
      ],
    }).sort({ createdAt: -1 });

    // 2. Fallback to the absolute last paid EMI
    const targetEmi =
      foreclosureEmi ||
      (await EMI.findOne({
        $or: [{ loanId: loan._id }, { loanNumber: loan.loanNumber }],
        status: "Paid",
      }).sort({ dueDate: -1, createdAt: -1 }));

    if (targetEmi) {
      if (!formattedLoan.status.foreclosureDetails) {
        formattedLoan.status.foreclosureDetails = {};
      }

      if (targetEmi.remarks) {
        // Updated regex to prioritize currency symbols/terms and exclude date-like patterns
        const amtMatch =
          targetEmi.remarks.match(
            /(?:Amount|Settlement|₹|Rs\.?)\s*([\d,.]+)/i,
          ) ||
          targetEmi.remarks.match(/[₹]\s*([\d,.]+)/) ||
          targetEmi.remarks.match(/(?<![\/\d])\b([\d,.]+)(?!\s*[\/\d])/); // Avoid numbers surrounded by slashes (dates)
        if (amtMatch) {
          formattedLoan.status.foreclosureDetails.foreclosureAmount =
            parseFloat(amtMatch[1].replace(/,/g, ""));
        }
      }

      if (!formattedLoan.status.foreclosureDetails.foreclosureAmount) {
        formattedLoan.status.foreclosureDetails.foreclosureAmount =
          targetEmi.amountPaid || targetEmi.emiAmount;
      }

      formattedLoan.status.foreclosureDetails.foreclosureDate =
        targetEmi.paymentDate || targetEmi.createdAt;
    }

    // Final fallback for amount: check loan's own remarks
    if (
      !formattedLoan.status.foreclosureDetails?.foreclosureAmount &&
      loan.remarks
    ) {
      const loanAmtMatch =
        loan.remarks.match(/(?:Amount|Settlement|₹|Rs\.?)\s*([\d,.]+)/i) ||
        loan.remarks.match(/[₹]\s*([\d,.]+)/) ||
        loan.remarks.match(/(?<![\/\d])\b([\d,.]+)(?!\s*[\/\d])/);
      if (loanAmtMatch) {
        if (!formattedLoan.status.foreclosureDetails)
          formattedLoan.status.foreclosureDetails = {};
        formattedLoan.status.foreclosureDetails.foreclosureAmount = parseFloat(
          loanAmtMatch[1].replace(/,/g, ""),
        );
      }
    }

    // Processed By Fallback: Use creator if specific's processor is unknown
    if (
      !formattedLoan.status.foreclosureDetails?.foreclosedBy &&
      !loan.foreclosedBy
    ) {
      if (!formattedLoan.status.foreclosureDetails)
        formattedLoan.status.foreclosureDetails = {};
      formattedLoan.status.foreclosureDetails.foreclosedBy =
        loan.createdBy?.name || "System";
    }

    // Ensure we ALWAYS have a date for closed loans (using updatedAt as absolute fallback)
    if (!formattedLoan.status.foreclosureDetails?.foreclosureDate) {
      if (!formattedLoan.status.foreclosureDetails)
        formattedLoan.status.foreclosureDetails = {};
      formattedLoan.status.foreclosureDetails.foreclosureDate =
        loan.foreclosureDate || loan.updatedAt;
    }
  }

  sendResponse(res, 200, "success", "Loan found", null, formattedLoan);
});

const updateLoan = asyncHandler(async (req, res, next) => {
  if (
    !mongoose.Types.ObjectId.isValid(req.params.id) ||
    req.params.id === "undefined"
  ) {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }
  let loan = await Loan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  const {
    customerDetails,
    loanTerms,
    vehicleInformation,
    status: statusObj,
    clientResponse: topLevelClientResponse,
    nextFollowUpDate: topLevelNextFollowUpDate,
  } = req.body;

  // Support nested foreclosureDetails in status object
  const foreclosureDetails = statusObj?.foreclosureDetails;

  const currentPrincipal =
    loanTerms?.principalAmount !== undefined
      ? loanTerms.principalAmount
      : loan.principalAmount;
  const currentRoi =
    loanTerms?.annualInterestRate !== undefined
      ? loanTerms.annualInterestRate
      : loan.annualInterestRate;
  const currentTenure =
    loanTerms?.tenureMonths !== undefined
      ? loanTerms.tenureMonths
      : loan.tenureMonths;

  const monthlyEMI = calculateEMI(currentPrincipal, currentRoi, currentTenure);
  const calculatedTotalInterest =
    parseFloat(currentPrincipal) *
    (parseFloat(currentRoi) / 100) *
    parseInt(currentTenure);

  const updateData = {
    // Flatten customerDetails
    ...(customerDetails && {
      customerName: customerDetails.customerName,
      address: customerDetails.address,
      ownRent: customerDetails.ownRent,
      mobileNumbers: customerDetails.mobileNumbers,
      panNumber: customerDetails.panNumber,
      aadharNumber: customerDetails.aadharNumber,
      guarantorName: customerDetails.guarantorName,
      guarantorMobileNumbers: customerDetails.guarantorMobileNumbers,
    }),
    // Flatten loanTerms
    ...(loanTerms && {
      loanNumber: loanTerms.loanNumber,
      principalAmount: loanTerms.principalAmount,
      processingFeeRate: loanTerms.processingFeeRate,
      processingFee: loanTerms.processingFee,
      tenureMonths: loanTerms.tenureMonths,
      annualInterestRate: loanTerms.annualInterestRate,
      dateLoanDisbursed: loanTerms.dateLoanDisbursed,
      emiStartDate: loanTerms.emiStartDate,
      emiEndDate: loanTerms.emiEndDate,
    }),
    // Flatten vehicleInformation
    ...(vehicleInformation && {
      vehicleNumber: vehicleInformation.vehicleNumber,
      chassisNumber: vehicleInformation.chassisNumber,
      engineNumber: vehicleInformation.engineNumber,
      modelYear: vehicleInformation.modelYear,
      typeOfVehicle: vehicleInformation.typeOfVehicle,
      ywBoard: vehicleInformation.ywBoard,
      dealerName: vehicleInformation.dealerName,
      dealerNumber: vehicleInformation.dealerNumber,
      fcDate: vehicleInformation.fcDate,
      insuranceDate: vehicleInformation.insuranceDate,
      rtoWorkPending: vehicleInformation.rtoWorkPending,
      hpEntry: vehicleInformation.hpEntry || loan.hpEntry,
    }),
    // Automatic Status Derivation
    status: foreclosureDetails?.foreclosureDate
      ? "Closed"
      : statusObj?.isSeized || loan.isSeized
        ? "Seized"
        : "Active",

    paymentStatus: statusObj?.paymentStatus || loan.paymentStatus,
    isSeized:
      statusObj?.isSeized !== undefined ? statusObj.isSeized : loan.isSeized,
    docChecklist: statusObj?.docChecklist || loan.docChecklist,
    remarks: statusObj?.remarks || loan.remarks,
    clientResponse:
      statusObj?.clientResponse !== undefined
        ? statusObj.clientResponse
        : topLevelClientResponse !== undefined
          ? topLevelClientResponse
          : loan.clientResponse,
    nextFollowUpDate:
      statusObj?.nextFollowUpDate !== undefined
        ? statusObj.nextFollowUpDate || null
        : topLevelNextFollowUpDate !== undefined
          ? topLevelNextFollowUpDate || null
          : loan.nextFollowUpDate,

    // Flatten foreclosureDetails
    foreclosedBy: foreclosureDetails?.foreclosedBy || loan.foreclosedBy,
    foreclosureDate:
      foreclosureDetails?.foreclosureDate || loan.foreclosureDate,
    foreclosureAmount:
      foreclosureDetails?.foreclosureAmount !== undefined &&
      foreclosureDetails?.foreclosureAmount !== ""
        ? foreclosureDetails.foreclosureAmount
        : loan.foreclosureAmount,

    monthlyEMI,
    totalInterestAmount: calculatedTotalInterest,
    updatedBy: req.user._id,
  };

  loan = await Loan.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  // Handle SeizedVehicle, ClosedLoan, and Followup records after update
  if (updateData.status === "Seized" || updateData.isSeized) {
    await SeizedVehicle.findOneAndUpdate(
      { loanId: loan._id },
      {
        loanId: loan._id,
        loanModel: "Loan",
        seizedDate: loan.seizedDate || new Date(),
        status: loan.seizedStatus || "For Seizing",
        remarks: `Auto-created/updated via Loan sync. ${loan.remarks || ""}`,
        createdBy: req.user._id,
      },
      { upsert: true, new: true },
    );
  }

  if (
    updateData.status === "Closed" &&
    (updateData.foreclosureDate || loan.foreclosureDate)
  ) {
    await ClosedLoan.findOneAndUpdate(
      { loanId: loan._id },
      {
        loanId: loan._id,
        loanModel: "Loan",
        closureType: loan.soldDetails?.sellAmount ? "Sold" : "Foreclosure",
        closureDate: loan.foreclosureDate || new Date(),
        amount: loan.foreclosureAmount || 0,
        processedBy: loan.foreclosedBy || req.user._id,
        soldDetails: loan.soldDetails,
        remarks: `Auto-created/updated via Loan sync. ${loan.remarks || ""}`,
      },
      { upsert: true, new: true },
    );
  }

  if (
    topLevelClientResponse ||
    topLevelNextFollowUpDate ||
    statusObj?.clientResponse
  ) {
    await Followup.create({
      loanId: loan._id,
      loanModel: "Loan",
      loanType: "Monthly",
      followupDate: new Date(),
      clientResponse:
        topLevelClientResponse ||
        statusObj?.clientResponse ||
        loan.clientResponse,
      remarks: loan.remarks,
      nextFollowupDate: topLevelNextFollowUpDate || statusObj?.nextFollowUpDate,
      followedUpBy: req.user._id,
    });
  }

  // Refetch to include virtuals
  loan = await populateLoanDetails(Loan.findById(loan._id));

  // Synchronize EMIs if relevant terms changed
  if (loanTerms || customerDetails || (statusObj && statusObj.status)) {
    const emis = await EMI.find({ loanId: loan._id }).sort({ emiNumber: 1 });
    const oldTenure = emis.length;
    const newTenure = parseInt(currentTenure);
    const newEmiStartDate = loanTerms?.emiStartDate
      ? new Date(loanTerms.emiStartDate)
      : new Date(loan.emiStartDate);

    // 1. Update existing EMIs
    const updatePromises = emis.map((emi, index) => {
      const emiNum = index + 1;
      const updates = {};

      // Update denormalized info
      if (customerDetails?.customerName)
        updates.customerName = customerDetails.customerName;
      if (loanTerms?.loanNumber) updates.loanNumber = loanTerms.loanNumber;

      // Update EMI amount for pending/partially paid EMIs
      if (emi.status !== "Paid") {
        updates.emiAmount = monthlyEMI;
      }

      // Update due dates based on new emiStartDate
      updates.dueDate = addMonths(new Date(newEmiStartDate), emiNum - 1);

      return EMI.findByIdAndUpdate(emi._id, updates);
    });

    await Promise.all(updatePromises);

    // 2. Handle Tenure Increase
    if (newTenure > oldTenure) {
      const extraEmis = [];
      for (let i = oldTenure + 1; i <= newTenure; i++) {
        extraEmis.push({
          loanId: loan._id,
          loanNumber: loan.loanNumber,
          customerName: loan.customerName,
          emiNumber: i,
          dueDate: addMonths(new Date(newEmiStartDate), i - 1),
          emiAmount: monthlyEMI,
          status: "Pending",
        });
      }
      if (extraEmis.length > 0) {
        await EMI.insertMany(extraEmis);
      }
    }
    // 3. Handle Tenure Decrease
    else if (newTenure < oldTenure) {
      // Remove extra EMIs only if they are Pending
      await EMI.deleteMany({
        loanId: loan._id,
        emiNumber: { $gt: newTenure },
        status: "Pending",
      });
    }
  }

  sendResponse(
    res,
    200,
    "success",
    "Loan updated and EMIs synchronized successfully",
    null,
    formatLoanResponse(loan),
  );
});

const toggleSeizedStatus = asyncHandler(async (req, res, next) => {
  if (
    !mongoose.Types.ObjectId.isValid(req.params.id) ||
    req.params.id === "undefined"
  ) {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }
  const loan = await Loan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  loan.isSeized = !loan.isSeized;

  // Simultaneously update the status field to match isSeized
  if (loan.isSeized) {
    loan.status = "Seized";
    // loan.seizedDate = new Date(); // Removed to defer countdown
    loan.seizedStatus = "For Seizing";
  } else {
    // If we are un-seizing, revert to Active.
    loan.status = "Active";
    loan.seizedDate = undefined;
    loan.seizedStatus = undefined;
  }

  await loan.save();

  if (loan.isSeized) {
    await SeizedVehicle.findOneAndUpdate(
      { loanId: loan._id },
      {
        loanId: loan._id,
        loanModel: "Loan",
        seizedDate: new Date(),
        status: "For Seizing",
        remarks: "Status toggled to Seized",
        createdBy: req.user._id,
      },
      { upsert: true, new: true },
    );
  } else {
    // If un-seizing, we could update the SeizedVehicle status to Re-activate or delete it
    await SeizedVehicle.findOneAndUpdate(
      { loanId: loan._id },
      { status: "Re-activate", remarks: "Status toggled back to Active" },
    );
  }

  sendResponse(
    res,
    200,
    "success",
    `Loan ${loan.isSeized ? "seized" : "unseized"} successfully`,
    null,
    formatLoanResponse(loan),
  );
});
// export all values
const getPendingPayments = asyncHandler(async (req, res, next) => {
  const {
    customerName,
    loanNumber,
    vehicleNumber,
    mobileNumber,
    status,
    nextFollowUpDate,
  } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  let query = {};

  if (customerName) {
    query.customerName = { $regex: customerName, $options: "i" };
  }
  if (loanNumber) {
    query.loanNumber = { $regex: loanNumber, $options: "i" };
  }
  if (vehicleNumber) {
    query.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
  }
  if (mobileNumber) {
    query.$or = [
      { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
      { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
    ];
  }
  if (nextFollowUpDate) {
    const start = new Date(nextFollowUpDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(nextFollowUpDate);
    end.setHours(23, 59, 59, 999);
    query.nextFollowUpDate = { $gte: start, $lte: end };
  }

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Removed: independence of Pending and Follow-up pages.
  // Pending page now only cares about EMI status.
  const result = await Loan.aggregate([
    {
      $match: {
        ...query,
        status: { $ne: "Closed" },
      },
    },
    {
      $lookup: {
        from: "emis",
        localField: "_id",
        foreignField: "loanId",
        as: "emis",
      },
    },
    {
      $addFields: {
        pendingEmisList: {
          $filter: {
            input: "$emis",
            as: "emi",
            cond: {
              $and: [
                { $ne: ["$$emi.status", "Paid"] },
                // If nextFollowUpDate is provided, we include ALL Pending/Partial EMIs to ensure the loan shows up
                // If NOT provided, we strictly filter by overdue EMIs (dueDate <= now)
                { $lte: ["$$emi.dueDate", now] },
                status === "Pending"
                  ? { $in: ["$$emi.status", ["Pending", "Overdue"]] }
                  : status
                    ? { $eq: ["$$emi.status", status] }
                    : {
                        $in: [
                          "$$emi.status",
                          ["Pending", "Partially Paid", "Overdue"],
                        ],
                      },
              ],
            },
          },
        },
      },
    },
    {
      $match: {
        $expr: { $gt: [{ $size: "$pendingEmisList" }, 0] },
      },
    },
    {
      $project: {
        loanId: "$_id",
        loanNumber: 1,
        customerName: 1,
        guarantorName: 1,
        status: 1,
        mobileNumbers: 1,
        guarantorMobileNumbers: 1,
        vehicleNumber: 1,
        model: 1,
        unpaidMonths: {
          $cond: {
            if: { $gt: [{ $size: "$pendingEmisList" }, 0] },
            then: { $size: "$pendingEmisList" },
            else: 1, // Show at least 1 month if included via follow-up
          },
        },
        totalDueAmount: {
          $reduce: {
            input: "$pendingEmisList",
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                { $subtract: ["$$this.emiAmount", "$$this.amountPaid"] },
              ],
            },
          },
        },
        earliestDueDate: { $min: "$pendingEmisList.dueDate" },
        earliestEmiId: {
          $let: {
            vars: {
              overdueEmi: { $arrayElemAt: ["$pendingEmisList", 0] },
            },
            in: { $toString: "$$overdueEmi._id" },
          },
        },
        clientResponse: 1,
        paymentStatus: 1,
      },
    },
    { $sort: { earliestDueDate: 1 } },
    {
      $facet: {
        payments: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const payments = result[0].payments;
  const total = result[0].totalCount[0]?.count || 0;

  sendResponse(
    res,
    200,
    "success",
    "Pending payments fetched successfully",
    null,
    {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  );
});

const getPendingEmiDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || id === "undefined") {
    return next(new ErrorHandler("Invalid EMI ID provided", 400));
  }

  // First get the loanId for this EMI
  const currentEmi = await EMI.findById(id);
  if (!currentEmi) {
    return next(new ErrorHandler(`EMI details not found for ID: ${id}`, 404));
  }

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  console.log(
    `[getPendingEmiDetails] Filtering with now: ${now.toISOString()}, loanId: ${currentEmi.loanId}`,
  );

  const emiDetails = await EMI.aggregate([
    {
      $match: {
        loanId: new mongoose.Types.ObjectId(currentEmi.loanId),
        status: { $ne: "Paid" },
        dueDate: { $lte: now },
      },
    },
    { $sort: { dueDate: 1 } },
    {
      $lookup: {
        from: "payments",
        localField: "_id",
        foreignField: "emiId",
        as: "paymentRecords",
      },
    },
    {
      $lookup: {
        from: "loans",
        localField: "loanId",
        foreignField: "_id",
        as: "loan",
      },
    },
    { $unwind: "$loan" },
    {
      $project: {
        _id: 1,
        loanId: "$loan._id",
        loanModel: { $literal: "Loan" },
        loanNumber: "$loan.loanNumber",
        customerName: "$loan.customerName",
        mobileNumbers: "$loan.mobileNumbers",
        address: "$loan.address",
        guarantorName: "$loan.guarantorName",
        guarantorMobileNumbers: "$loan.guarantorMobileNumbers",
        vehicleNumber: "$loan.vehicleNumber",
        model: "$loan.model",
        engineNumber: "$loan.engineNumber",
        chassisNumber: "$loan.chassisNumber",
        principalAmount: "$loan.principalAmount",
        monthlyEMI: "$loan.monthlyEMI",
        emiAmount: "$emiAmount",
        amountPaid: "$amountPaid",
        status: "$status",
        dueDate: "$dueDate",
        overdue: "$overdue",
        remarks: "$remarks",
        paymentHistory: "$paymentHistory",
        clientResponse: "$loan.clientResponse",
        nextFollowUpDate: "$loan.nextFollowUpDate",
        emiNumber: 1,
        paymentRecords: 1,
      },
    },
  ]);

  if (!emiDetails || emiDetails.length === 0) {
    return next(new ErrorHandler(`EMI details not found for ID: ${id}`, 404));
  }

  sendResponse(
    res,
    200,
    "success",
    "EMI details fetched successfully",
    null,
    emiDetails,
  );
});

const updatePaymentStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || id === "undefined") {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }

  const loan = await Loan.findByIdAndUpdate(
    id,
    { paymentStatus },
    { new: true, runValidators: true },
  );

  if (!loan) {
    return next(new ErrorResponse("Loan not found", 404));
  }

  sendResponse(
    res,
    200,
    "success",
    "Payment status updated successfully",
    null,
    formatLoanResponse(loan),
  );
});

const getFollowupLoans = asyncHandler(async (req, res, next) => {
  const {
    customerName,
    loanNumber,
    vehicleNumber,
    mobileNumber,
    nextFollowUpDate,
    loanType: queryLoanType,
  } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Filter for nextFollowUpDate
  const dateToFilter =
    nextFollowUpDate || new Date().toISOString().split("T")[0];
  const start = new Date(dateToFilter);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateToFilter);
  end.setHours(23, 59, 59, 999);
  const dateFilter = { nextFollowUpDate: { $gte: start, $lte: end } };

  // Common filters
  let commonQuery = { ...dateFilter, status: { $ne: "Closed" } };
  if (customerName)
    commonQuery.customerName = { $regex: customerName, $options: "i" };
  if (loanNumber)
    commonQuery.loanNumber = { $regex: loanNumber, $options: "i" };
  if (vehicleNumber)
    commonQuery.vehicleNumber = { $regex: vehicleNumber, $options: "i" };

  // Helper function for aggregation pipeline
  const getPipeline = (modelName, loanType, mobileField) => {
    let pipeline = [{ $match: commonQuery }];

    if (mobileNumber) {
      if (modelName === "Loan") {
        pipeline[0].$match.$or = [
          { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
          { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
        ];
      } else {
        pipeline[0].$match.mobileNumber = { $regex: mobileNumber, $options: "i" };
      }
    }

    pipeline.push(
      {
        $lookup: {
          from: "emis",
          localField: "_id",
          foreignField: "loanId",
          as: "emis",
        },
      },
      {
        $addFields: {
          pendingEmisList: {
            $filter: {
              input: "$emis",
              as: "emi",
              cond: {
                $and: [
                  { $ne: ["$$emi.status", "Paid"] },
                  { $eq: ["$$emi.loanModel", modelName] },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          loanId: "$_id",
          loanNumber: 1,
          customerName: 1,
          guarantorName: modelName === "Loan" ? 1 : { $literal: "—" },
          status: 1,
          mobileNumbers: modelName === "Loan" ? 1 : ["$mobileNumber"],
          guarantorMobileNumbers:
            modelName === "Loan" ? 1 : { $literal: [] },
          vehicleNumber: 1,
          model: 1,
          loanType: { $literal: loanType },
          loanModel: { $literal: modelName },
          unpaidMonths: { $size: "$pendingEmisList" },
          totalDueAmount: {
            $reduce: {
              input: "$pendingEmisList",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $subtract: [
                      { $toDouble: "$$this.emiAmount" },
                      { $toDouble: { $ifNull: ["$$this.amountPaid", 0] } },
                    ],
                  },
                ],
              },
            },
          },
          earliestEmiId: {
            $let: {
              vars: {
                firstPending: {
                  $arrayElemAt: [
                    {
                      $sortArray: {
                        input: "$pendingEmisList",
                        sortBy: { dueDate: 1 },
                      },
                    },
                    0,
                  ],
                },
              },
              in: { $toString: { $ifNull: ["$$firstPending._id", null] } },
            },
          },
          earliestDueDate: {
            $let: {
              vars: {
                sortedEmis: {
                  $sortArray: {
                    input: "$pendingEmisList",
                    sortBy: { dueDate: 1 },
                  },
                },
              },
              in: { $arrayElemAt: ["$$sortedEmis.dueDate", 0] },
            },
          },
          clientResponse: 1,
          nextFollowUpDate: 1,
        },
      },
    );
    return pipeline;
  };

  // Run aggregations for models based on loanType filter
  const promises = [];
  
  if (!queryLoanType || queryLoanType.toLowerCase() === "monthly") {
    promises.push(Loan.aggregate(getPipeline("Loan", "Monthly")));
  } else {
    promises.push(Promise.resolve([]));
  }
  
  if (!queryLoanType || queryLoanType.toLowerCase() === "daily") {
    promises.push(DailyLoan.aggregate(getPipeline("DailyLoan", "Daily")));
  } else {
    promises.push(Promise.resolve([]));
  }
  
  if (!queryLoanType || queryLoanType.toLowerCase() === "weekly") {
    promises.push(WeeklyLoan.aggregate(getPipeline("WeeklyLoan", "Weekly")));
  } else {
    promises.push(Promise.resolve([]));
  }

  const [monthlyFollowups, dailyFollowups, weeklyFollowups] = await Promise.all(promises);

  // Combine and sort
  let allFollowups = [
    ...monthlyFollowups,
    ...dailyFollowups,
    ...weeklyFollowups,
  ].sort((a, b) => {
    // Sort by earliestDueDate ascending
    if (!a.earliestDueDate) return 1;
    if (!b.earliestDueDate) return -1;
    return new Date(a.earliestDueDate) - new Date(b.earliestDueDate);
  });

  const total = allFollowups.length;
  const paginatedFollowups = allFollowups.slice(skip, skip + limit);

  sendResponse(
    res,
    200,
    "success",
    "Follow-up loans fetched successfully",
    null,
    {
      payments: paginatedFollowups,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  );
});

const updateFollowup = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { loanModel, clientResponse, nextFollowUpDate } = req.body;

  let Model;
  if (loanModel === "Loan") Model = Loan;
  else if (loanModel === "DailyLoan") Model = DailyLoan;
  else if (loanModel === "WeeklyLoan") Model = WeeklyLoan;
  else {
    return next(new ErrorHandler("Invalid loan model provided", 400));
  }

  const loan = await Model.findById(id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Update the loan document
  loan.clientResponse =
    clientResponse !== undefined ? clientResponse : loan.clientResponse;
  loan.nextFollowUpDate =
    nextFollowUpDate !== undefined
      ? nextFollowUpDate
        ? new Date(nextFollowUpDate)
        : null
      : loan.nextFollowUpDate;

  await loan.save();

  // Create follow-up history record
  if (clientResponse || nextFollowUpDate !== undefined) {
    const loanType =
      loanModel === "Loan" ? "Monthly" : loanModel.replace("Loan", "");

    await Followup.create({
      loanId: loan._id,
      loanModel,
      loanType,
      followupDate: new Date(),
      clientResponse: clientResponse || loan.clientResponse,
      nextFollowupDate: loan.nextFollowUpDate,
      followedUpBy: req.user?._id,
    });
  }

  sendResponse(
    res,
    200,
    "success",
    "Follow-up updated successfully",
    null,
    loan,
  );
});

const getFollowupHistory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const history = await Followup.find({ loanId: id })
    .sort({ followupDate: -1 })
    .populate("followedUpBy", "name email");

  sendResponse(
    res,
    200,
    "success",
    "Follow-up history fetched successfully",
    null,
    history,
  );
});

const getForeclosureLoans = asyncHandler(async (req, res, next) => {
  const { loanNumber, customerName, mobileNumber, vehicleNumber } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (vehicleNumber)
    query.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
  if (mobileNumber) {
    query.$or = [
      { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
      { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
    ];
  }

  const result = await Loan.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "emis",
        localField: "_id",
        foreignField: "loanId",
        as: "emis",
      },
    },
    {
      $project: {
        loanId: "$_id",
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        principalAmount: 1,
        tenureMonths: 1,
        monthlyEMI: 1,
        status: 1,
        paidEmis: {
          $size: {
            $filter: {
              input: "$emis",
              as: "e",
              cond: { $eq: ["$$e.status", "Paid"] },
            },
          },
        },
        totalPaidAmount: { $sum: "$emis.amountPaid" },
        clientResponse: 1,
      },
    },
    {
      $addFields: {
        remainingPrincipal: {
          $max: [
            0,
            {
              $subtract: [
                "$principalAmount",
                {
                  $multiply: [
                    "$paidEmis",
                    {
                      $divide: [
                        { $toDouble: "$principalAmount" },
                        { $toInt: "$tenureMonths" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        foreclosureAmount: "$remainingPrincipal",
      },
    },
    { $sort: { loanNumber: 1 } },
    {
      $facet: {
        loans: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const loans = result[0].loans;
  const total = result[0].totalCount[0]?.count || 0;

  sendResponse(
    res,
    200,
    "success",
    "Foreclosure loans fetched successfully",
    null,
    {
      loans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  );
});

const forecloseLoan = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    remainingPrincipal,
    totalAmount,
    paymentBreakdown, // Array of { mode, amount }
    paymentDate,
    remarks,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Loan ID", 400));
  }

  const loan = await Loan.findById(id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  if (loan.status === "Closed") {
    return next(new ErrorHandler("the loan has been closed already", 400));
  }

  // 0. Amount Validation
  const totalReceived = (paymentBreakdown || []).reduce(
    (acc, curr) => acc + parseFloat(curr.amount || 0),
    0,
  );

  if (totalReceived < parseFloat(totalAmount) - 0.1) {
    return next(
      new ErrorHandler(
        `Received total (₹${totalReceived}) is less than total foreclosure amount (₹${totalAmount})`,
        400,
      ),
    );
  }

  const pDate = paymentDate ? new Date(paymentDate) : new Date();
  const pMode =
    (paymentBreakdown || []).map((p) => p.mode).join(", ") || "CASH";

  // 1. Update Loan status to Closed
  const updatedLoan = await Loan.findByIdAndUpdate(
    id,
    {
      status: "Closed",
      paymentStatus: "Closed",
      remarks: remarks || `Foreclosed on ${pDate.toLocaleDateString()}`,
      foreclosedBy: req.user?._id,
      foreclosureDate: pDate,
      foreclosureAmount: totalAmount,
      remainingPrincipal,
    },
    { new: true },
  )
    .populate("createdBy", "name")
    .populate("foreclosedBy", "name")
    .populate("updatedBy", "name");

  // 2. Update all pending/partial EMIs for this loan to "Paid"
  await EMI.updateMany(
    {
      loanId: id,
      status: { $ne: "Paid" },
    },
    {
      $set: {
        status: "Paid",
        paymentDate: pDate,
        paymentMode: pMode,
        remarks: `Loan foreclosed. Total Payment: ₹${totalAmount} via ${pMode}`,
      },
    },
  );

  // 3. Create Payment Records for each mode in breakdown
  const firstPendingEmi = await EMI.findOne({
    loanId: id,
    status: "Paid",
    paymentDate: pDate,
  }).sort({ emiNumber: 1 });

  const Payment = require("../models/Payment");
  const paymentRecords = (paymentBreakdown || []).map((p) => ({
    emiId: firstPendingEmi?._id || new mongoose.Types.ObjectId(),
    loanId: id,
    loanModel: loan.loanModel || "Loan",
    amount: parseFloat(p.amount),
    mode: p.mode,
    paymentDate: pDate,
    paymentType:
      loan.loanModel === "DailyLoan"
        ? "Daily"
        : loan.loanModel === "WeeklyLoan"
          ? "Weekly"
          : "Monthly",
    status: "Success",
    remarks: `Foreclosure Split-Payment (${p.mode}) for Loan ${loan.loanNumber}`,
    collectedBy: req.user._id,
  }));

  if (paymentRecords.length > 0) {
    await Payment.insertMany(paymentRecords);
  }

  sendResponse(res, 200, "success", "Loan foreclosed successfully", null, {
    loan: formatLoanResponse(updatedLoan),
  });
});

const getSeizedVehicles = asyncHandler(async (req, res, next) => {
  const { loanNumber, customerName, vehicleNumber, mobileNumber } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = { isSeized: true };

  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (vehicleNumber)
    query.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
  if (mobileNumber) {
    query.$or = [
      { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
      { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
    ];
  }

  const result = await Loan.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "emis",
        localField: "_id",
        foreignField: "loanId",
        as: "emis",
      },
    },
    {
      $addFields: {
        pendingEmisList: {
          $filter: {
            input: "$emis",
            as: "emi",
            cond: { $ne: ["$$emi.status", "Paid"] },
          },
        },
      },
    },
    {
      $project: {
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        vehicleNumber: 1,
        seizedDate: 1,
        seizedStatus: 1,
        updatedAt: 1,
        createdAt: 1,
        unpaidMonths: { $size: "$pendingEmisList" },
        totalDueAmount: {
          $reduce: {
            input: "$pendingEmisList",
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                {
                  $subtract: [
                    "$$this.emiAmount",
                    { $ifNull: ["$$this.amountPaid", 0] },
                  ],
                },
              ],
            },
          },
        },
        clientResponse: 1,
      },
    },
    { $sort: { seizedDate: -1, updatedAt: -1 } },
    {
      $facet: {
        vehicles: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const vehicles = result[0].vehicles;
  const total = result[0].totalCount[0]?.count || 0;

  sendResponse(
    res,
    200,
    "success",
    "Seized vehicles fetched successfully",
    null,
    {
      vehicles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  );
});

const updateSeizedStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { seizedStatus, soldDetails } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || id === "undefined") {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }

  const validStatuses = ["For Seizing", "Seized", "Sold", "Re-activate"];
  if (!validStatuses.includes(seizedStatus)) {
    return next(new ErrorHandler("Invalid seized status", 400));
  }

  const existingLoan = await Loan.findById(id);
  if (!existingLoan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Once status is 'Sold', it cannot be changed back
  if (existingLoan.seizedStatus === "Sold") {
    return next(
      new ErrorHandler(
        "This vehicle has already been sold and the status cannot be changed.",
        400,
      ),
    );
  }

  const updateData = { seizedStatus };

  // If status is changed to 'Seized', set the seizedDate to start countdown
  if (seizedStatus === "Seized") {
    updateData.seizedDate = new Date();
  }

  // If Sold: record sale details and close the loan
  if (seizedStatus === "Sold") {
    if (!soldDetails || !soldDetails.sellAmount) {
      return next(new ErrorHandler("Please provide sale details", 400));
    }
    updateData.status = "Closed";
    updateData.soldDetails = {
      ...soldDetails,
      soldDate: soldDetails.soldDate || new Date(),
      soldBy: req.user._id,
    };
  }

  // If Re-activate: un-seize the loan and revert to Active
  if (seizedStatus === "Re-activate") {
    updateData.isSeized = false;
    updateData.status = "Active";
    updateData.seizedDate = undefined;
    updateData.soldDetails = undefined;
  }

  const loan = await Loan.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: false },
  );

  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  sendResponse(
    res,
    200,
    "success",
    `Seized status updated to ${seizedStatus}`,
    null,
    {
      _id: loan._id,
      seizedStatus: loan.seizedStatus,
      status: loan.status,
      seizedDate: loan.seizedDate,
    },
  );
});

const getAnalyticsStats = asyncHandler(async (req, res, next) => {
  const startTotal = performance.now();

  // Consolidation Strategy: Use $facet to get multiple metrics from a single collection pass
  // Parallelize the 4 core aggregations
  const [loanMetrics, dailyMetrics, weeklyMetrics, expenseStats, userStats] =
    await Promise.all([
      // 1. Main Loan Collection Metrics
      Loan.aggregate([
        {
          $facet: {
            disbursement: [
              { $group: { _id: null, total: { $sum: "$principalAmount" } } },
            ],
            foreclosure: [
              {
                $group: {
                  _id: null,
                  total: { $sum: { $ifNull: ["$foreclosureAmount", 0] } },
                },
              },
            ],
            sold: [
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: {
                      $ifNull: [
                        "$soldDetails.totalAmount",
                        "$soldDetails.sellAmount",
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            counts: [
              {
                $group: {
                  _id: null,
                  pending: {
                    $sum: {
                      $cond: [{ $eq: ["$paymentStatus", "Pending"] }, 1, 0],
                    },
                  },
                  partial: {
                    $sum: {
                      $cond: [
                        { $eq: ["$paymentStatus", "Partially Paid"] },
                        1,
                        0,
                      ],
                    },
                  },
                  active: {
                    $sum: {
                      $cond: [{ $ne: ["$status", "Closed"] }, 1, 0],
                    },
                  },
                },
              },
            ],
            vehicleStatus: [
              { $match: { isSeized: true } },
              {
                $group: {
                  _id: {
                    $switch: {
                      branches: [
                        {
                          case: { $eq: ["$seizedStatus", "Seized"] },
                          then: "Seized",
                        },
                        {
                          case: { $eq: ["$seizedStatus", "Sold"] },
                          then: "Sold",
                        },
                      ],
                      default: "For Seizing",
                    },
                  },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]),

      // 2. Daily Loan Metrics
      mongoose.model("DailyLoan").aggregate([
        {
          $facet: {
            disbursement: [
              {
                $group: {
                  _id: null,
                  total: { $sum: "$disbursementAmount" },
                  collected: { $sum: "$totalAmount" },
                },
              },
            ],
            counts: [
              {
                $group: {
                  _id: null,
                  pending: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$paidEmis", 0] },
                            { $eq: ["$status", "Active"] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  partial: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $gt: ["$paidEmis", 0] },
                            { $gt: ["$remainingEmis", 0] },
                            { $eq: ["$status", "Active"] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  active: {
                    $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
                  },
                },
              },
            ],
          },
        },
      ]),

      // 3. Weekly Loan Metrics
      mongoose.model("WeeklyLoan").aggregate([
        {
          $facet: {
            disbursement: [
              {
                $group: {
                  _id: null,
                  total: { $sum: "$disbursementAmount" },
                  collected: { $sum: "$totalAmount" },
                },
              },
            ],
            counts: [
              {
                $group: {
                  _id: null,
                  pending: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$paidEmis", 0] },
                            { $eq: ["$status", "Active"] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  partial: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $gt: ["$paidEmis", 0] },
                            { $gt: ["$remainingEmis", 0] },
                            { $eq: ["$status", "Active"] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  active: {
                    $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
                  },
                },
              },
            ],
          },
        },
      ]),

      // 4. EMI & Expenses
      Promise.all([
        EMI.aggregate([
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $add: [
                    { $ifNull: ["$amountPaid", 0] },
                    { $ifNull: ["$overdue", 0] },
                  ],
                },
              },
            },
          },
        ]),
        mongoose
          .model("Expense")
          .aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      ]),

      // 5. User Roles (Fastest)
      mongoose.model("User").aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  // Destructure Loan Results
  const lMain = loanMetrics[0];
  const lDaily = dailyMetrics[0];
  const lWeekly = weeklyMetrics[0];
  const [emiResults, expenseResults] = expenseStats;

  // Calculate Totals
  const totalLoanAmount =
    (lMain.disbursement[0]?.total || 0) +
    (lDaily.disbursement[0]?.total || 0) +
    (lWeekly.disbursement[0]?.total || 0);

  const totalCollectedAmount =
    (emiResults[0]?.total || 0) +
    (lDaily.disbursement[0]?.collected || 0) +
    (lWeekly.disbursement[0]?.collected || 0) +
    (lMain.foreclosure[0]?.total || 0) +
    (lMain.sold[0]?.total || 0);

  const pendingLoansCount =
    (lMain.counts[0]?.pending || 0) +
    (lDaily.counts[0]?.pending || 0) +
    (lWeekly.counts[0]?.pending || 0);

  const partialLoansCount =
    (lMain.counts[0]?.partial || 0) +
    (lDaily.counts[0]?.partial || 0) +
    (lWeekly.counts[0]?.partial || 0);

  const activeLoansCount =
    (lMain.counts[0]?.active || 0) +
    (lDaily.counts[0]?.active || 0) +
    (lWeekly.counts[0]?.active || 0);

  const totalExpenses = expenseResults[0]?.total || 0;

  // Format Vehicle Data
  const vehicleData = { "For Seizing": 0, Seized: 0, Sold: 0 };
  lMain.vehicleStatus.forEach((s) => {
    vehicleData[s._id] = s.count;
  });

  // Format User Data
  const userData = { SUPER_ADMIN: 0, ADMIN: 0, EMPLOYEE: 0 };
  userStats.forEach((s) => {
    userData[s._id] = s.count;
  });

  const duration = (performance.now() - startTotal).toFixed(2);
  console.log(`[PERF] getAnalyticsStats - Total: ${duration}ms`);

  sendResponse(
    res,
    200,
    "success",
    "Analytics stats fetched successfully",
    null,
    {
      cards: {
        totalLoanAmount,
        totalCollectedAmount,
        pendingLoansCount,
        partialLoansCount,
        activeLoansCount,
        totalExpenses,
        userCounts: userData,
      },
      vehicleStats: Object.keys(vehicleData).map((key) => ({
        name: key,
        value: vehicleData[key],
      })),
      performance: { totalTime: `${duration}ms` },
    },
  );
});

// @desc    Get consolidated to-do list
// @route   GET /api/loans/todo-list
// @access  Private
const getTodoList = asyncHandler(async (req, res, next) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Include everything until end of today

  const [followups, hpEntries, rtoWorks] = await Promise.all([
    // 1. Follow-ups (Loans with nextFollowUpDate <= today and status Active)
    Loan.find({
      status: "Active",
      nextFollowUpDate: { $lte: today },
    })
      .select("loanNumber customerName mobileNumbers nextFollowUpDate")
      .lean(),

    // 2. HP Entry Applications
    Loan.find({
      status: "Active",
      hpEntry: "Applied",
    })
      .select("loanNumber customerName vehicleNumber hpEntry")
      .lean(),

    // 3. RTO Work Pending
    Loan.find({
      status: "Active",
      rtoWorkPending: { $exists: true, $not: { $size: 0 } },
    })
      .select("loanNumber customerName vehicleNumber rtoWorkPending")
      .lean(),
  ]);

  sendResponse(res, 200, "success", "To-do list fetched successfully", null, {
    followups,
    hpEntries,
    rtoWorks,
  });
});

// @desc    Get detailed collection report
// @route   GET /api/loans/collection-report
// @access  Private
const getCollectionReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, collectedBy } = req.query;
  const match = {
    date: {},
  };

  if (startDate) match.date.$gte = new Date(startDate);
  if (endDate) match.date.$lte = new Date(endDate);
  if (Object.keys(match.date).length === 0) delete match.date;
  if (collectedBy) match.collectedBy = new mongoose.Types.ObjectId(collectedBy);

  const collections = await mongoose.model("Payment").aggregate([
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "collectedBy",
        foreignField: "_id",
        as: "collector",
      },
    },
    { $unwind: "$collector" },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          collector: "$collector.name",
          mode: "$mode",
        },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": -1, "_id.collector": 1 } },
  ]);

  sendResponse(res, 200, "success", "Collection report fetched successfully", null, collections);
});

// export all values
module.exports = {
  createLoan,
  getAllLoans,
  getLoanByLoanNumber,
  getLoanById,
  updateLoan,
  toggleSeizedStatus,
  calculateEMIApi,
  getPendingPayments,
  getFollowupLoans,
  getPendingEmiDetails,
  updatePaymentStatus,
  getForeclosureLoans,
  forecloseLoan,
  getSeizedVehicles,
  updateSeizedStatus,
  getAnalyticsStats,
  updateFollowup,
  getFollowupHistory,
  getTodoList,
  getCollectionReport,
};
