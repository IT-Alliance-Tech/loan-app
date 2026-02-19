const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const EMI = require("../models/EMI");
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

  return parseFloat(emi.toFixed(2));
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
    model: vehicleInformation?.model,
    typeOfVehicle: vehicleInformation?.typeOfVehicle,
    ywBoard: vehicleInformation?.ywBoard,
    dealerName: vehicleInformation?.dealerName,
    dealerNumber: vehicleInformation?.dealerNumber,
    fcDate: vehicleInformation?.fcDate,
    insuranceDate: vehicleInformation?.insuranceDate,
    rtoWorkPending: vehicleInformation?.rtoWorkPending,

    // status
    status: statusObj?.status,
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
  const { loanNumber, customerName, mobileNumber, tenureMonths, status } =
    req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};

  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (mobileNumber) {
    query.$or = [
      { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
      { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
    ];
  }
  if (tenureMonths) query.tenureMonths = tenureMonths;
  if (status) {
    if (status === "Seized") query.isSeized = true;
    if (status === "Active") query.isSeized = false;
  }

  const total = await Loan.countDocuments(query);
  const loans = await Loan.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  sendResponse(res, 200, "success", "Loans fetched successfully", null, {
    loans: loans.map((loan) => formatLoanResponse(loan)),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

const getLoanByLoanNumber = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findOne({ loanNumber: req.params.loanNumber })
    .populate("createdBy", "name")
    .populate("foreclosedBy", "name")
    .populate("updatedBy", "name");

  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Calculate remaining principal
  const paidEmisCount = await EMI.countDocuments({
    loanId: loan._id,
    status: "Paid",
  });
  const remainingPrincipalAmount = Math.max(
    0,
    loan.principalAmount -
      paidEmisCount * (loan.principalAmount / loan.tenureMonths),
  );

  const formattedLoan = formatLoanResponse(loan);
  formattedLoan.loanTerms.remainingPrincipalAmount = remainingPrincipalAmount;

  // Aggressive recovery logic for foreclosureDetails for older loans
  if (
    loan.status?.toLowerCase() === "closed" &&
    !loan.foreclosureAmount // Trigger if 0, null, or undefined
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
      const loanAmtMatch = loan.remarks.match(
        /(?:Amount|Settlement|₹|Rs\.?)\s*([\d,.]+)/i,
      );
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
  const loan = await Loan.findById(req.params.id)
    .populate("createdBy", "name")
    .populate("foreclosedBy", "name")
    .populate("updatedBy", "name");
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Calculate remaining principal
  const paidEmisCount = await EMI.countDocuments({
    loanId: loan._id,
    status: "Paid",
  });
  const remainingPrincipalAmount = Math.max(
    0,
    loan.principalAmount -
      paidEmisCount * (loan.principalAmount / loan.tenureMonths),
  );

  const formattedLoan = formatLoanResponse(loan);
  formattedLoan.loanTerms.remainingPrincipalAmount = remainingPrincipalAmount;

  // Aggressive recovery logic for foreclosureDetails for older loans
  if (
    loan.status?.toLowerCase() === "closed" &&
    !loan.foreclosureAmount // Trigger if 0, null, or undefined
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
      const loanAmtMatch = loan.remarks.match(
        /(?:Amount|Settlement|₹|Rs\.?)\s*([\d,.]+)/i,
      );
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
      model: vehicleInformation.model,
      typeOfVehicle: vehicleInformation.typeOfVehicle,
      ywBoard: vehicleInformation.ywBoard,
      dealerName: vehicleInformation.dealerName,
      dealerNumber: vehicleInformation.dealerNumber,
      fcDate: vehicleInformation.fcDate,
      insuranceDate: vehicleInformation.insuranceDate,
      rtoWorkPending: vehicleInformation.rtoWorkPending,
    }),
    // Flatten status
    ...(statusObj && {
      status: statusObj.status,
      paymentStatus: statusObj.paymentStatus,
      isSeized: statusObj.isSeized,
      docChecklist: statusObj.docChecklist,
      remarks: statusObj.remarks,
      clientResponse: statusObj.clientResponse || topLevelClientResponse,
      nextFollowUpDate: statusObj.nextFollowUpDate || topLevelNextFollowUpDate,
    }),
    // Flatten foreclosureDetails
    ...(foreclosureDetails && {
      foreclosedBy: foreclosureDetails.foreclosedBy || loan.foreclosedBy,
      foreclosureDate:
        foreclosureDetails.foreclosureDate || loan.foreclosureDate,
      foreclosureAmount:
        foreclosureDetails.foreclosureAmount !== undefined &&
        foreclosureDetails.foreclosureAmount !== ""
          ? foreclosureDetails.foreclosureAmount
          : loan.foreclosureAmount,
    }),
    // If statusObj is missing, still handle top-level updates
    ...(topLevelClientResponse !== undefined &&
      !statusObj && { clientResponse: topLevelClientResponse }),
    ...(topLevelNextFollowUpDate !== undefined &&
      !statusObj && { nextFollowUpDate: topLevelNextFollowUpDate }),
    monthlyEMI,
    totalInterestAmount: calculatedTotalInterest,
    updatedBy: req.user._id,
  };

  loan = await Loan.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("createdBy", "name")
    .populate("foreclosedBy", "name")
    .populate("updatedBy", "name");

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
  await loan.save();

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
            cond: {
              $and: [
                { $ne: ["$$emi.status", "Paid"] },
                // If nextFollowUpDate is provided, we include ALL Pending/Partial EMIs to ensure the loan shows up
                // If NOT provided, we strictly filter by overdue EMIs (dueDate <= now)
                nextFollowUpDate ? true : { $lte: ["$$emi.dueDate", now] },
                status
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
        $or: [
          { $expr: { $gt: [{ $size: "$pendingEmisList" }, 0] } },
          // IF we are searching specifically for a follow-up date,
          // allow the loan even if no EMIs are strictly "overdue" yet,
          // as long as it has SOME Pending/Partial EMIs
          {
            $and: [
              { nextFollowUpDate: { $exists: true, $ne: null } },
              {
                $expr: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$emis",
                          as: "e",
                          cond: {
                            $in: [
                              "$$e.status",
                              ["Pending", "Partially Paid", "Overdue"],
                            ],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            ],
          },
        ],
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
        unpaidMonths: { $size: "$pendingEmisList" },
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
          $arrayElemAt: [
            {
              $map: {
                input: {
                  $filter: {
                    input: "$pendingEmisList",
                    as: "e",
                    cond: {
                      $eq: [
                        "$$e.dueDate",
                        { $min: "$pendingEmisList.dueDate" },
                      ],
                    },
                  },
                },
                in: "$$this._id",
              },
            },
            0,
          ],
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
        remarks: "$remarks",
        clientResponse: "$loan.clientResponse",
        emiNumber: 1,
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

  // Mandatory date filtering for follow-ups
  const dateToFilter =
    nextFollowUpDate || new Date().toISOString().split("T")[0];
  const start = new Date(dateToFilter);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateToFilter);
  end.setHours(23, 59, 59, 999);
  query.nextFollowUpDate = { $gte: start, $lte: end };

  // For followup logic, we don't care if the payment is officially "overdue" yet
  // We just want ANY loan that has at least one Pending/Partial EMI
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
            cond: {
              $in: ["$$emi.status", ["Pending", "Partially Paid", "Overdue"]],
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
        guarantorName: 1,
        status: 1,
        mobileNumbers: 1,
        guarantorMobileNumbers: 1,
        vehicleNumber: 1,
        model: 1,
        unpaidMonths: { $size: "$pendingEmisList" },
        totalDueAmount: {
          $reduce: {
            input: "$pendingEmisList",
            initialValue: 0,
            in: { $add: ["$$value", "$$this.emiAmount"] },
          },
        },
        earliestEmiId: {
          $let: {
            vars: {
              firstPending: { $arrayElemAt: ["$pendingEmisList", 0] },
            },
            in: { $toString: "$$firstPending._id" },
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
    { $sort: { earliestDueDate: 1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        payments: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
  const payments = result[0].payments;

  sendResponse(
    res,
    200,
    "success",
    "Follow-up loans fetched successfully",
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

const getForeclosureLoans = asyncHandler(async (req, res, next) => {
  const { loanNumber, customerName } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };

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
  const { foreclosureCharges, od, miscellaneousFee, totalAmount, remarks } =
    req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Loan ID", 400));
  }

  const loan = await Loan.findById(id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // 1. Update Loan status to Closed
  loan.status = "Closed";
  loan.remarks = remarks || `Foreclosed on ${new Date().toLocaleDateString()}`;
  loan.foreclosedBy = req.user?._id;
  loan.foreclosureDate = new Date();
  loan.foreclosureAmount = totalAmount;
  await loan.save();

  // 2. Update all pending/partial EMIs for this loan to "Paid"
  // We mark them as Paid because the foreclosure payment covers them.
  await EMI.updateMany(
    {
      loanId: id,
      status: { $ne: "Paid" },
    },
    {
      $set: {
        status: "Paid",
        paymentDate: new Date(),
        paymentMode: "Foreclosure",
        remarks: `Loan foreclosed. Total Payment: ₹${totalAmount}`,
      },
    },
  );

  sendResponse(res, 200, "success", "Loan foreclosed successfully", null, {
    loan,
  });
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
};
