const mongoose = require("mongoose");
const WeeklyLoan = require("../models/WeeklyLoan");
const EMI = require("../models/EMI");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { addDays } = require("date-fns");

// Create Weekly Loan
exports.createWeeklyLoan = asyncHandler(async (req, res, next) => {
  const {
    loanNumber,
    customerName,
    mobileNumber,
    disbursementAmount,
    startDate,
    totalEmis,
    paidEmis,
    nextFollowUpDate,
    remarks,
    clientResponse,
    processingFeeRate,
    emiStartDate,
  } = req.body;

  if (
    !loanNumber ||
    !customerName ||
    !mobileNumber ||
    !disbursementAmount ||
    !startDate ||
    !totalEmis
  ) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  const existingLoan = await WeeklyLoan.findOne({ loanNumber });
  if (existingLoan) {
    return next(new ErrorHandler("Loan number already exists", 400));
  }

  // Calculations
  const amount = parseFloat(disbursementAmount);
  const totalWeeks = parseInt(totalEmis);
  const feeRate = parseFloat(processingFeeRate) || 10;
  const currentPaidEmis = parseInt(paidEmis) || 0;

  // Processing Fee
  const processingFee = amount * (feeRate / 100);

  // Interest Calculation (Removed as requested)
  const weeklyPrincipal = amount / totalWeeks;
  const emiAmount = weeklyPrincipal;
  const totalInterestAmount = 0;

  // Dates
  const disburseDate = new Date(startDate);
  const eStartDate = emiStartDate
    ? new Date(emiStartDate)
    : new Date(disburseDate);
  const nextEmiDate = new Date(eStartDate);
  // Next EMI is usually the same as start date or one week after?
  // Standard app behavior usually sets emiStartDate as the date of first payment.

  const eEndDate = new Date(eStartDate);
  eEndDate.setDate(eEndDate.getDate() + (totalWeeks - 1) * 7);

  const totalAmount = emiAmount * currentPaidEmis;
  const totalCollected = totalAmount + processingFee;
  const remainingEmis = totalWeeks - currentPaidEmis;
  const remainingPrincipalAmount = amount - weeklyPrincipal * currentPaidEmis;

  const weeklyLoan = await WeeklyLoan.create({
    loanNumber,
    customerName,
    mobileNumber,
    disbursementAmount: amount,
    startDate: disburseDate,
    emiStartDate: eStartDate,
    emiEndDate: eEndDate,
    totalEmis: totalWeeks,
    emiAmount,
    paidEmis: currentPaidEmis,
    remainingEmis,
    totalAmount,
    nextEmiDate: eStartDate, // Setting next EMI to start date initially
    processingFee,
    processingFeeRate: feeRate,
    interestRate: 0,
    totalInterestAmount: 0,
    totalCollected,
    remainingPrincipalAmount,
    expenses: 0,
    nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
    remarks,
    clientResponse,
    status: status || "Active",
    createdBy: req.user._id,
  });

  // Generate EMIs
  const emis = [];
  let currentEmiDateArr = new Date(startDate);

  for (let i = 1; i <= parseInt(totalEmis); i++) {
    const isPaid = i <= currentPaidEmis;
    emis.push({
      loanId: weeklyLoan._id,
      loanModel: "WeeklyLoan",
      loanNumber: weeklyLoan.loanNumber,
      customerName: weeklyLoan.customerName,
      emiNumber: i,
      dueDate: new Date(currentEmiDateArr),
      emiAmount: emiAmount.toFixed(2),
      status: isPaid ? "Paid" : "Pending",
      amountPaid: isPaid ? emiAmount.toFixed(2) : 0,
      paymentDate: isPaid ? new Date(startDate) : null,
      paymentMode: isPaid ? "CASH" : "",
    });
    currentEmiDateArr.setDate(currentEmiDateArr.getDate() + 7);
  }

  await EMI.insertMany(emis);

  sendResponse(
    res,
    201,
    "success",
    "Weekly loan created and EMIs generated successfully",
    null,
    weeklyLoan,
  );
});

// Get EMIs for a Weekly Loan
exports.getWeeklyLoanEMIs = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  let emis = await EMI.find({ loanId: id, loanModel: "WeeklyLoan" })
    .sort({
      emiNumber: 1,
    })
    .populate("updatedBy", "name");

  // Lazy generation for existing records that don't have EMIs
  if (emis.length === 0) {
    const weeklyLoan = await WeeklyLoan.findById(id);
    if (!weeklyLoan) {
      return next(new ErrorHandler("Weekly loan not found", 404));
    }

    const generatedEmis = [];
    let currentEmiDateArr = new Date(weeklyLoan.startDate);
    const emiAmt = weeklyLoan.disbursementAmount / weeklyLoan.totalEmis;

    for (let i = 1; i <= weeklyLoan.totalEmis; i++) {
      const isPaid = i <= (weeklyLoan.paidEmis || 0);
      generatedEmis.push({
        loanId: weeklyLoan._id,
        loanModel: "WeeklyLoan",
        loanNumber: weeklyLoan.loanNumber,
        customerName: weeklyLoan.customerName,
        emiNumber: i,
        dueDate: new Date(currentEmiDateArr),
        emiAmount: emiAmt.toFixed(2),
        status: isPaid ? "Paid" : "Pending",
        amountPaid: isPaid ? emiAmt.toFixed(2) : 0,
        paymentDate: isPaid ? new Date(weeklyLoan.startDate) : null,
        paymentMode: isPaid ? "CASH" : "",
      });
      currentEmiDateArr.setDate(currentEmiDateArr.getDate() + 7);
    }

    emis = await EMI.insertMany(generatedEmis);
  }

  sendResponse(res, 200, "success", "EMIs fetched successfully", null, emis);
});

// Get All Weekly Loans
exports.getAllWeeklyLoans = asyncHandler(async (req, res, next) => {
  const { status, followup, searchQuery, page = 1, limit = 10 } = req.query;
  const query = {};

  if (status) {
    query.status = status;
  }

  if (followup === "true") {
    query.nextFollowUpDate = { $exists: true, $ne: null };
  }

  if (searchQuery) {
    query.$or = [
      { loanNumber: { $regex: searchQuery, $options: "i" } },
      { customerName: { $regex: searchQuery, $options: "i" } },
      { mobileNumber: { $regex: searchQuery, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const total = await WeeklyLoan.countDocuments(query);
  const weeklyLoans = await WeeklyLoan.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  sendResponse(res, 200, "success", "Weekly loans fetched successfully", null, {
    weeklyLoans,
    total,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      limit: Number(limit),
    },
  });
});

// Get Single Weekly Loan
exports.getWeeklyLoanById = asyncHandler(async (req, res, next) => {
  const weeklyLoan = await WeeklyLoan.findById(req.params.id);

  if (!weeklyLoan) {
    return next(new ErrorHandler("Weekly loan not found", 404));
  }

  sendResponse(res, 200, "success", "Weekly loan found", null, weeklyLoan);
});

// Update Weekly Loan
exports.updateWeeklyLoan = asyncHandler(async (req, res, next) => {
  let weeklyLoan = await WeeklyLoan.findById(req.params.id);

  if (!weeklyLoan) {
    return next(new ErrorHandler("Weekly loan not found", 404));
  }

  const {
    loanNumber,
    customerName,
    mobileNumber,
    disbursementAmount,
    startDate,
    totalEmis,
    paidEmis,
    nextFollowUpDate,
    remarks,
    clientResponse,
    status,
    processingFeeRate,
    emiStartDate,
  } = req.body;

  // Update logic with recalculations
  const updateData = {
    loanNumber: loanNumber || weeklyLoan.loanNumber,
    customerName: customerName || weeklyLoan.customerName,
    mobileNumber: mobileNumber || weeklyLoan.mobileNumber,
    disbursementAmount:
      disbursementAmount !== undefined
        ? parseFloat(disbursementAmount)
        : weeklyLoan.disbursementAmount,
    startDate: startDate || weeklyLoan.startDate,
    emiStartDate:
      emiStartDate ||
      weeklyLoan.emiStartDate ||
      startDate ||
      weeklyLoan.startDate,
    totalEmis:
      totalEmis !== undefined ? parseInt(totalEmis) : weeklyLoan.totalEmis,
    paidEmis: paidEmis !== undefined ? parseInt(paidEmis) : weeklyLoan.paidEmis,
    processingFeeRate:
      processingFeeRate !== undefined
        ? parseFloat(processingFeeRate)
        : weeklyLoan.processingFeeRate || 10,
    nextFollowUpDate:
      nextFollowUpDate !== undefined
        ? nextFollowUpDate
        : weeklyLoan.nextFollowUpDate,
    remarks: remarks !== undefined ? remarks : weeklyLoan.remarks,
    clientResponse:
      clientResponse !== undefined ? clientResponse : weeklyLoan.clientResponse,
    status: status || weeklyLoan.status,
    interestRate: 0,
    expenses: 0,
  };

  // Recalculate
  const amount = updateData.disbursementAmount;
  const totalWeeks = updateData.totalEmis;
  const currentPaidEmis = updateData.paidEmis;
  const feeRate = updateData.processingFeeRate;
  const intRate = updateData.interestRate;

  // Processing Fee
  const processingFee = amount * (feeRate / 100);

  // Interest Calculation (Removed)
  const weeklyPrincipal = amount / totalWeeks;
  const emiAmount = weeklyPrincipal;
  const totalInterestAmount = 0;

  // EMI End Date
  const eStartDate = new Date(updateData.emiStartDate);
  const eEndDate = new Date(eStartDate);
  eEndDate.setDate(eEndDate.getDate() + (totalWeeks - 1) * 7);
  updateData.emiEndDate = eEndDate;

  const totalAmount = emiAmount * currentPaidEmis;
  const totalCollected = totalAmount + processingFee;
  const remainingEmis = totalWeeks - currentPaidEmis;
  const remainingPrincipalAmount = amount - weeklyPrincipal * currentPaidEmis;

  Object.assign(updateData, {
    emiAmount,
    processingFee,
    totalInterestAmount,
    totalCollected,
    remainingEmis,
    remainingPrincipalAmount,
    nextFollowUpDate: nextFollowUpDate
      ? new Date(nextFollowUpDate)
      : updateData.nextFollowUpDate,
  });

  weeklyLoan = await WeeklyLoan.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  // Synchronize EMIs if date or principal changed
  if (
    emiStartDate ||
    disbursementAmount !== undefined ||
    totalEmis !== undefined
  ) {
    const emis = await EMI.find({
      loanId: weeklyLoan._id,
      loanModel: "WeeklyLoan",
    }).sort({ emiNumber: 1 });

    if (emis.length > 0) {
      const updatePromises = emis.map((emi, index) => {
        const newDueDate = new Date(weeklyLoan.emiStartDate);
        newDueDate.setDate(newDueDate.getDate() + index * 7);

        return EMI.findByIdAndUpdate(emi._id, {
          dueDate: newDueDate,
          emiAmount: weeklyLoan.emiAmount.toFixed(2),
          // We don't change status/amountPaid here to preserve payment history
        });
      });
      await Promise.all(updatePromises);
    }
  }

  sendResponse(
    res,
    200,
    "success",
    "Weekly loan updated successfully",
    null,
    weeklyLoan,
  );
});

// Delete Weekly Loan
exports.deleteWeeklyLoan = asyncHandler(async (req, res, next) => {
  const weeklyLoan = await WeeklyLoan.findById(req.params.id);

  if (!weeklyLoan) {
    return next(new ErrorHandler("Weekly loan not found", 404));
  }

  await weeklyLoan.deleteOne();

  sendResponse(res, 200, "success", "Weekly loan deleted successfully");
});

// Get Weekly Pending Payments (Aggregation)
exports.getWeeklyPendingPayments = asyncHandler(async (req, res, next) => {
  const {
    customerName,
    loanNumber,
    mobileNumber,
    pageNum = 1,
    limitNum = 10,
  } = req.query;
  const page = parseInt(pageNum, 10) || 1;
  const limit = parseInt(limitNum, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (mobileNumber)
    query.mobileNumber = { $regex: mobileNumber, $options: "i" };

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const result = await WeeklyLoan.aggregate([
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
                { $lte: ["$$emi.dueDate", now] },
                { $eq: ["$$emi.loanModel", "WeeklyLoan"] },
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
        mobileNumber: 1,
        status: 1,
        unpaidWeeks: { $size: "$pendingEmisList" },
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
                    { $toDouble: "$$this.amountPaid" },
                  ],
                },
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
    "Weekly pending payments fetched successfully",
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

// Get Weekly Follow-up Loans (Aggregation)
exports.getWeeklyFollowupLoans = asyncHandler(async (req, res, next) => {
  const {
    customerName,
    loanNumber,
    mobileNumber,
    nextFollowUpDate,
    pageNum = 1,
    limitNum = 10,
  } = req.query;
  const page = parseInt(pageNum, 10) || 1;
  const limit = parseInt(limitNum, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (mobileNumber)
    query.mobileNumber = { $regex: mobileNumber, $options: "i" };

  // Mandatory date filtering for follow-ups
  const dateToFilter =
    nextFollowUpDate || new Date().toISOString().split("T")[0];
  const start = new Date(dateToFilter);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateToFilter);
  end.setHours(23, 59, 59, 999);
  query.nextFollowUpDate = { $gte: start, $lte: end };

  const result = await WeeklyLoan.aggregate([
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
                { $eq: ["$$emi.loanModel", "WeeklyLoan"] },
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
        mobileNumber: 1,
        status: 1,
        unpaidWeeks: { $size: "$pendingEmisList" },
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
                    { $toDouble: "$$this.amountPaid" },
                  ],
                },
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
        nextFollowUpDate: 1,
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
    "Weekly follow-up payments fetched successfully",
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

// Get Weekly Pending EMI Details
exports.getWeeklyPendingEmiDetails = asyncHandler(async (req, res, next) => {
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
        from: "weeklyloans", // Collection name for WeeklyLoan model
        localField: "loanId",
        foreignField: "_id",
        as: "loan",
      },
    },
    { $unwind: "$loan" },
    {
      $lookup: {
        from: "users",
        localField: "updatedBy",
        foreignField: "_id",
        as: "updatedUserInfo",
      },
    },
    {
      $unwind: {
        path: "$updatedUserInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        loanId: "$loan._id",
        loanNumber: "$loan.loanNumber",
        customerName: "$loan.customerName",
        mobileNumber: "$loan.mobileNumber",
        disbursementAmount: "$loan.disbursementAmount",
        emiAmount: "$emiAmount",
        amountPaid: "$amountPaid",
        status: "$status",
        dueDate: "$dueDate",
        paymentHistory: 1,
        paymentDate: 1,
        paymentMode: 1,
        remarks: "$remarks",
        clientResponse: "$loan.clientResponse",
        emiNumber: 1,
        updatedAt: 1,
        updatedBy: { $ifNull: ["$updatedUserInfo.name", "$updatedBy"] },
      },
    },
  ]);

  if (!emiDetails || emiDetails.length === 0) {
    // If no overdue EMIs, return at least the current one if it exists
    // (though the monthly logic suggests we only care about overdue ones in this view)
    return next(
      new ErrorHandler(`No pending installments found for this loan`, 404),
    );
  }

  sendResponse(
    res,
    200,
    "success",
    "Weekly EMI details fetched successfully",
    null,
    emiDetails,
  );
});
