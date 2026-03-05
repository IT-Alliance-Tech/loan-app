const mongoose = require("mongoose");
const DailyLoan = require("../models/DailyLoan");
const EMI = require("../models/EMI");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

// Create Daily Loan
exports.createDailyLoan = asyncHandler(async (req, res, next) => {
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
    status,
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

  const existingLoan = await DailyLoan.findOne({ loanNumber });
  if (existingLoan) {
    return next(new ErrorHandler("Loan number already exists", 400));
  }

  // Calculations
  const amount = parseFloat(disbursementAmount);
  const totalDays = parseInt(totalEmis);
  const feeRate = parseFloat(processingFeeRate) || 10;
  const currentPaidEmis = parseInt(paidEmis) || 0;

  const processingFee = amount * (feeRate / 100);
  const dailyPrincipal = amount / totalDays;
  const emiAmount = dailyPrincipal;

  // Dates
  const disburseDate = new Date(startDate);
  const eStartDate = emiStartDate
    ? new Date(emiStartDate)
    : new Date(disburseDate);

  const eEndDate = new Date(eStartDate);
  eEndDate.setDate(eEndDate.getDate() + (totalDays - 1));

  const totalAmount = emiAmount * currentPaidEmis;
  const totalCollected = totalAmount + processingFee;
  const remainingEmis = totalDays - currentPaidEmis;
  const remainingPrincipalAmount = amount - dailyPrincipal * currentPaidEmis;

  const dailyLoan = await DailyLoan.create({
    loanNumber,
    customerName,
    mobileNumber,
    disbursementAmount: amount,
    startDate: disburseDate,
    emiStartDate: eStartDate,
    emiEndDate: eEndDate,
    totalEmis: totalDays,
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

  for (let i = 1; i <= totalDays; i++) {
    const isPaid = i <= currentPaidEmis;
    emis.push({
      loanId: dailyLoan._id,
      loanModel: "DailyLoan",
      loanNumber: dailyLoan.loanNumber,
      customerName: dailyLoan.customerName,
      emiNumber: i,
      dueDate: new Date(currentEmiDateArr),
      emiAmount: emiAmount.toFixed(2),
      status: isPaid ? "Paid" : "Pending",
      amountPaid: isPaid ? emiAmount.toFixed(2) : 0,
      paymentDate: isPaid ? new Date(startDate) : null,
      paymentMode: isPaid ? "CASH" : "",
    });
    currentEmiDateArr.setDate(currentEmiDateArr.getDate() + 1);
  }

  await EMI.insertMany(emis);

  sendResponse(
    res,
    201,
    "success",
    "Daily loan created and EMIs generated successfully",
    null,
    dailyLoan,
  );
});

// Get EMIs for a Daily Loan
exports.getDailyLoanEMIs = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  let emis = await EMI.find({ loanId: id, loanModel: "DailyLoan" })
    .sort({
      emiNumber: 1,
    })
    .populate("updatedBy", "name");

  // Lazy generation for existing records that don't have EMIs
  if (emis.length === 0) {
    const dailyLoan = await DailyLoan.findById(id);
    if (!dailyLoan) {
      return next(new ErrorHandler("Daily loan not found", 404));
    }

    const generatedEmis = [];
    let currentEmiDateArr = new Date(dailyLoan.startDate);
    const emiAmt = dailyLoan.disbursementAmount / dailyLoan.totalEmis;

    for (let i = 1; i <= dailyLoan.totalEmis; i++) {
      const isPaid = i <= (dailyLoan.paidEmis || 0);
      generatedEmis.push({
        loanId: dailyLoan._id,
        loanModel: "DailyLoan",
        loanNumber: dailyLoan.loanNumber,
        customerName: dailyLoan.customerName,
        emiNumber: i,
        dueDate: new Date(currentEmiDateArr),
        emiAmount: emiAmt.toFixed(2),
        status: isPaid ? "Paid" : "Pending",
        amountPaid: isPaid ? emiAmt.toFixed(2) : 0,
        paymentDate: isPaid ? new Date(dailyLoan.startDate) : null,
        paymentMode: isPaid ? "CASH" : "",
      });
      currentEmiDateArr.setDate(currentEmiDateArr.getDate() + 1);
    }

    emis = await EMI.insertMany(generatedEmis);
  }

  sendResponse(res, 200, "success", "EMIs fetched successfully", null, emis);
});

// Get All Daily Loans
exports.getAllDailyLoans = asyncHandler(async (req, res, next) => {
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
  const total = await DailyLoan.countDocuments(query);
  const dailyLoans = await DailyLoan.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  sendResponse(res, 200, "success", "Daily loans fetched successfully", null, {
    dailyLoans,
    total,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      limit: Number(limit),
    },
  });
});

// Get Single Daily Loan
exports.getDailyLoanById = asyncHandler(async (req, res, next) => {
  const dailyLoan = await DailyLoan.findById(req.params.id);

  if (!dailyLoan) {
    return next(new ErrorHandler("Daily loan not found", 404));
  }

  sendResponse(res, 200, "success", "Daily loan found", null, dailyLoan);
});

// Update Daily Loan
exports.updateDailyLoan = asyncHandler(async (req, res, next) => {
  let dailyLoan = await DailyLoan.findById(req.params.id);

  if (!dailyLoan) {
    return next(new ErrorHandler("Daily loan not found", 404));
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

  const updateData = {
    loanNumber: loanNumber || dailyLoan.loanNumber,
    customerName: customerName || dailyLoan.customerName,
    mobileNumber: mobileNumber || dailyLoan.mobileNumber,
    disbursementAmount:
      disbursementAmount !== undefined
        ? parseFloat(disbursementAmount)
        : dailyLoan.disbursementAmount,
    startDate: startDate || dailyLoan.startDate,
    emiStartDate:
      emiStartDate ||
      dailyLoan.emiStartDate ||
      startDate ||
      dailyLoan.startDate,
    totalEmis:
      totalEmis !== undefined ? parseInt(totalEmis) : dailyLoan.totalEmis,
    paidEmis: paidEmis !== undefined ? parseInt(paidEmis) : dailyLoan.paidEmis,
    processingFeeRate:
      processingFeeRate !== undefined
        ? parseFloat(processingFeeRate)
        : dailyLoan.processingFeeRate || 10,
    nextFollowUpDate:
      nextFollowUpDate !== undefined
        ? nextFollowUpDate
        : dailyLoan.nextFollowUpDate,
    remarks: remarks !== undefined ? remarks : dailyLoan.remarks,
    clientResponse:
      clientResponse !== undefined ? clientResponse : dailyLoan.clientResponse,
    status: status || dailyLoan.status,
  };

  const amount = updateData.disbursementAmount;
  const totalDays = updateData.totalEmis;
  const currentPaidEmis = updateData.paidEmis;
  const feeRate = updateData.processingFeeRate;

  const processingFee = amount * (feeRate / 100);
  const dailyPrincipal = amount / totalDays;
  const emiAmount = dailyPrincipal;

  const eStartDate = new Date(updateData.emiStartDate);
  const eEndDate = new Date(eStartDate);
  eEndDate.setDate(eEndDate.getDate() + (totalDays - 1));
  updateData.emiEndDate = eEndDate;

  const totalAmount = emiAmount * currentPaidEmis;
  const totalCollected = totalAmount + processingFee;
  const remainingEmis = totalDays - currentPaidEmis;
  const remainingPrincipalAmount = amount - dailyPrincipal * currentPaidEmis;

  Object.assign(updateData, {
    emiAmount,
    processingFee,
    totalCollected,
    remainingEmis,
    remainingPrincipalAmount,
    nextFollowUpDate: nextFollowUpDate
      ? new Date(nextFollowUpDate)
      : updateData.nextFollowUpDate,
  });

  dailyLoan = await DailyLoan.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (
    emiStartDate ||
    disbursementAmount !== undefined ||
    totalEmis !== undefined
  ) {
    const emis = await EMI.find({
      loanId: dailyLoan._id,
      loanModel: "DailyLoan",
    }).sort({ emiNumber: 1 });

    if (emis.length > 0) {
      const updatePromises = emis.map((emi, index) => {
        const newDueDate = new Date(dailyLoan.emiStartDate);
        newDueDate.setDate(newDueDate.getDate() + index);

        return EMI.findByIdAndUpdate(emi._id, {
          dueDate: newDueDate,
          emiAmount: dailyLoan.emiAmount.toFixed(2),
        });
      });
      await Promise.all(updatePromises);
    }
  }

  sendResponse(
    res,
    200,
    "success",
    "Daily loan updated successfully",
    null,
    dailyLoan,
  );
});

// Delete Daily Loan
exports.deleteDailyLoan = asyncHandler(async (req, res, next) => {
  const dailyLoan = await DailyLoan.findById(req.params.id);

  if (!dailyLoan) {
    return next(new ErrorHandler("Daily loan not found", 404));
  }

  await dailyLoan.deleteOne();
  sendResponse(res, 200, "success", "Daily loan deleted successfully");
});

// Get Daily Pending Payments
exports.getDailyPendingPayments = asyncHandler(async (req, res, next) => {
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

  const result = await DailyLoan.aggregate([
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
                { $lte: ["$$emi.dueDate", now] },
                { $eq: ["$$emi.loanModel", "DailyLoan"] },
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
        unpaidWeeks: { $size: "$pendingEmisList" }, // Keeping field name for UI compatibility, but it's days
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
    "Daily pending payments fetched successfully",
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

// Get Daily Follow-up Loans
exports.getDailyFollowupLoans = asyncHandler(async (req, res, next) => {
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

  const dateToFilter =
    nextFollowUpDate || new Date().toISOString().split("T")[0];
  const start = new Date(dateToFilter);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateToFilter);
  end.setHours(23, 59, 59, 999);
  query.nextFollowUpDate = { $gte: start, $lte: end };

  const result = await DailyLoan.aggregate([
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
                { $eq: ["$$emi.loanModel", "DailyLoan"] },
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
    "Daily follow-up payments fetched successfully",
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

// Get Daily Pending EMI Details
exports.getDailyPendingEmiDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || id === "undefined") {
    return next(new ErrorHandler("Invalid EMI ID provided", 400));
  }

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
        from: "dailyloans",
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
    return next(
      new ErrorHandler(`No pending installments found for this loan`, 404),
    );
  }

  sendResponse(
    res,
    200,
    "success",
    "Daily EMI details fetched successfully",
    null,
    emiDetails,
  );
});
