const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const Payment = require("../models/Payment");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { parseDateInLocalFormat, normalizeToMidnight } = require('../utils/dateUtils');

const getCollectionReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, collectedBy } = req.query;
  const match = {
    paymentDate: {},
  };

  if (startDate) match.paymentDate.$gte = new Date(startDate);
  if (endDate) match.paymentDate.$lte = new Date(endDate);
  if (Object.keys(match.paymentDate).length === 0) delete match.paymentDate;
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
          date: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" } },
          collector: "$collector.name",
          mode: "$mode",
          type: "$paymentType",
        },
        totalAmount: { $sum: { $ifNull: ["$totalAmount", "$amount"] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": -1, "_id.collector": 1 } },
  ]);

  sendResponse(
    res,
    200,
    "success",
    "Collection report fetched successfully",
    null,
    collections,
  );
});

const getCollectionTransactions = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, page = 1, limit = 25 } = req.query;
  const match = {};

  if (startDate || endDate) {
    match.paymentDate = {};
    if (startDate) {
      match.paymentDate.$gte = normalizeToMidnight(parseDateInLocalFormat(startDate));
    }
    if (endDate) {
      const end = normalizeToMidnight(parseDateInLocalFormat(endDate));
      end.setHours(23, 59, 59, 999);
      match.paymentDate.$lte = end;
    }
  }

  // Exclude Processing Fees from Collections tab (case-insensitive)
  match.paymentType = { $not: /processing fee/i };

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const total = await Payment.countDocuments(match);

  const transactions = await Payment.find(match)
    .populate({
      path: "emiId",
      select: "loanNumber customerName overdue emiNumber",
    })
    .populate({
      path: "collectedBy",
      select: "name",
    })
    .sort({ paymentDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Format the output
  const formattedTransactions = transactions.map((txn) => ({
    _id: txn._id,
    loanId: txn.loanId,
    loanModel: txn.loanModel,
    loanNumber: txn.emiId ? txn.emiId.loanNumber : "Unknown",
    emiNo: txn.emiId ? txn.emiId.emiNumber : "-",
    customerName: txn.emiId ? txn.emiId.customerName : "Unknown",
    emiAmount: txn.emiAmount || (txn.overdueAmount ? 0 : txn.amount) || 0,
    overdueAmount: txn.overdueAmount || 0,
    totalAmount: txn.totalAmount || txn.amount || txn.overdueAmount || 0,
    amount: txn.totalAmount || txn.amount || txn.overdueAmount || 0, // Fallback for UI
    paymentMode: txn.mode,
    paymentType: txn.paymentType,
    date: txn.paymentDate,
    updatedBy: txn.collectedBy ? txn.collectedBy.name : "System",
  }));

  sendResponse(
    res,
    200,
    "success",
    "Collection transactions fetched successfully",
    null,
    {
      transactions: formattedTransactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  );
});

const getLoansGivenSummary = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, page = 1, limit = 25 } = req.query;
  const matchDate = {};

  if (startDate || endDate) {
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchDate.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchDate.$lte = end;
    }
  }

  const query = {};
  if (Object.keys(matchDate).length > 0) {
    query.dateLoanDisbursed = matchDate;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Monthly Loans
  const monthlyPipeline = [
    {
      $match:
        Object.keys(matchDate).length > 0
          ? { dateLoanDisbursed: matchDate }
          : {},
    },
    {
      $project: {
        _id: 1,
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        amount: "$principalAmount",
        date: { $ifNull: ["$dateLoanDisbursed", "$createdAt"] },
        createdAt: 1,
        createdBy: 1,
        type: { $literal: "Monthly" },
      },
    },
  ];

  // Weekly Loans - Fallback to startDate if dateLoanDisbursed is missing
  const weeklyPipeline = [
    {
      $match:
        Object.keys(matchDate).length > 0
          ? {
              $or: [
                { dateLoanDisbursed: matchDate },
                {
                  $and: [
                    { dateLoanDisbursed: { $exists: false } },
                    { startDate: matchDate },
                  ],
                },
              ],
            }
          : {},
    },
    {
      $project: {
        _id: 1,
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        amount: "$disbursementAmount",
        date: {
          $ifNull: [
            "$dateLoanDisbursed",
            { $ifNull: ["$startDate", "$createdAt"] },
          ],
        },
        createdAt: 1,
        createdBy: 1,
        type: { $literal: "Weekly" },
      },
    },
  ];

  // Daily Loans - Fallback to startDate if dateLoanDisbursed is missing
  const dailyPipeline = [
    {
      $match:
        Object.keys(matchDate).length > 0
          ? {
              $or: [
                { dateLoanDisbursed: matchDate },
                {
                  $and: [
                    { dateLoanDisbursed: { $exists: false } },
                    { startDate: matchDate },
                  ],
                },
              ],
            }
          : {},
    },
    {
      $project: {
        _id: 1,
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        amount: "$disbursementAmount",
        date: {
          $ifNull: [
            "$dateLoanDisbursed",
            { $ifNull: ["$startDate", "$createdAt"] },
          ],
        },
        createdAt: 1,
        createdBy: 1,
        type: { $literal: "Daily" },
      },
    },
  ];

  const [monthlyRes, weeklyRes, dailyRes] = await Promise.all([
    Loan.aggregate(monthlyPipeline),
    WeeklyLoan.aggregate(weeklyPipeline),
    DailyLoan.aggregate(dailyPipeline),
  ]);

  const allLoansRaw = [...monthlyRes, ...weeklyRes, ...dailyRes].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const total = allLoansRaw.length;
  const paginatedLoans = allLoansRaw.slice(skip, skip + limitNum);

  // Populate createdBy
  const User = mongoose.model("User");
  const loanResults = await Promise.all(
    paginatedLoans.map(async (loan) => {
      const creator = await User.findById(loan.createdBy).select("name").lean();
      return {
        _id: loan._id,
        loanNumber: loan.loanNumber,
        customerName: loan.customerName,
        mobileNumber:
          loan.mobileNumbers && loan.mobileNumbers.length > 0
            ? loan.mobileNumbers[0]
            : "N/A",
        loanAmount: loan.amount,
        type: loan.type,
        date: loan.date || loan.createdAt,
        createdBy: creator ? creator.name : "System",
      };
    }),
  );

  sendResponse(res, 200, "success", "Loans given fetched successfully", null, {
    loans: loanResults,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

module.exports = {
  getCollectionReport,
  getCollectionTransactions,
  getLoansGivenSummary,
};
