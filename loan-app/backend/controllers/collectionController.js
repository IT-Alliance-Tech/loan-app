const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const Payment = require("../models/Payment");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

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
          type: "$paymentType"
        },
        totalAmount: { $sum: "$amount" },
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
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      match.paymentDate.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
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
      select: "loanNumber customerName",
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
    customerName: txn.emiId ? txn.emiId.customerName : "Unknown",
    amount: txn.amount,
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
      }
    },
  );
});

// @desc    Get summary of newly disbursed loans
// @route   GET /api/collections/loans-given
// @access  Private
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
    query.createdAt = matchDate;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // For combined collections, we need to fetch all matching IDs first to get total count, 
  // then sort and slice manually or use aggregate for better performance.
  // Given potential scale, aggregation is better.

  const monthlyPipeline = [
    { $match: query },
    { $project: { _id: 1, loanNumber: 1, customerName: 1, mobileNumbers: 1, amount: "$principalAmount", date: "$dateLoanDisbursed", createdAt: 1, createdBy: 1, type: { $literal: "Monthly" } } },
  ];

  const weeklyPipeline = [
    { $match: query },
    { $project: { _id: 1, loanNumber: 1, customerName: 1, mobileNumbers: 1, amount: "$disbursementAmount", date: "$startDate", createdAt: 1, createdBy: 1, type: { $literal: "Weekly" } } },
  ];

  const dailyPipeline = [
    { $match: query },
    { $project: { _id: 1, loanNumber: 1, customerName: 1, mobileNumbers: 1, amount: "$disbursementAmount", date: "$startDate", createdAt: 1, createdBy: 1, type: { $literal: "Daily" } } },
  ];

  const [monthlyRes, weeklyRes, dailyRes] = await Promise.all([
    Loan.aggregate(monthlyPipeline),
    WeeklyLoan.aggregate(weeklyPipeline),
    DailyLoan.aggregate(dailyPipeline)
  ]);

  const allLoansRaw = [...monthlyRes, ...weeklyRes, ...dailyRes]
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

  const total = allLoansRaw.length;
  const paginatedLoans = allLoansRaw.slice(skip, skip + limitNum);

  // Populate createdBy
  const User = mongoose.model("User");
  const loanResults = await Promise.all(paginatedLoans.map(async (loan) => {
    const creator = await User.findById(loan.createdBy).select("name").lean();
    return {
      _id: loan._id,
      loanNumber: loan.loanNumber,
      customerName: loan.customerName,
      mobileNumber: (loan.mobileNumbers && loan.mobileNumbers.length > 0) ? loan.mobileNumbers[0] : "N/A",
      loanAmount: loan.amount,
      type: loan.type,
      date: loan.date || loan.createdAt,
      createdBy: creator ? creator.name : "System",
    };
  }));

  sendResponse(
    res,
    200,
    "success",
    "Loans given fetched successfully",
    null,
    {
      loans: loanResults,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      }
    },
  );
});

module.exports = {
  getCollectionReport,
  getCollectionTransactions,
  getLoansGivenSummary,
};
