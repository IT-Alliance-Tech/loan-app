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
  const { startDate, endDate } = req.query;
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

  // Find all payments matching the date range
  const transactions = await Payment.find(match)
    .populate({
      path: "emiId",
      select: "loanNumber customerName",
    })
    .populate({
      path: "collectedBy",
      select: "name",
    })
    .sort({ paymentDate: -1, createdAt: -1 });

  // Format the output
  const formattedTransactions = transactions.map((txn) => ({
    _id: txn._id,
    loanNumber: txn.emiId ? txn.emiId.loanNumber : "Unknown",
    customerName: txn.emiId ? txn.emiId.customerName : "Unknown",
    amount: txn.amount,
    paymentMode: txn.mode,
    paymentType: txn.paymentType,
    loanModel: txn.loanModel,
    date: txn.paymentDate,
    updatedBy: txn.collectedBy ? txn.collectedBy.name : "System",
  }));

  sendResponse(
    res,
    200,
    "success",
    "Collection transactions fetched successfully",
    null,
    formattedTransactions,
  );
});

// @desc    Get summary of newly disbursed loans
// @route   GET /api/collections/loans-given
// @access  Private
const getLoansGivenSummary = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
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
    // Both creation date and document date represent standard "date issued" depending on logic. Usually createdAt will be fine.
    query.createdAt = matchDate;
  }

  // Fetch loans from all three collections
  const [monthlyLoans, weeklyLoans, dailyLoans] = await Promise.all([
    Loan.find(query)
      .select("loanNumber customerName mobileNumbers principalAmount createdAt createdBy")
      .populate("createdBy", "name")
      .lean(),
    WeeklyLoan.find(query)
      .select("loanNumber customerName mobileNumbers disbursementAmount createdAt createdBy")
      .populate("createdBy", "name")
      .lean(),
    DailyLoan.find(query)
      .select("loanNumber customerName mobileNumbers disbursementAmount createdAt createdBy")
      .populate("createdBy", "name")
      .lean(),
  ]);

  // Format array
  const formattedMonthly = monthlyLoans.map((l) => ({ 
    ...l, 
    loanAmount: l.principalAmount, 
    type: "Monthly" 
  }));
  const formattedWeekly = weeklyLoans.map((l) => ({ 
    ...l, 
    loanAmount: l.disbursementAmount, 
    type: "Weekly" 
  }));
  const formattedDaily = dailyLoans.map((l) => ({ 
    ...l, 
    loanAmount: l.disbursementAmount, 
    type: "Daily" 
  }));

  // Combine and sort descending by date
  const allLoans = [
    ...formattedMonthly,
    ...formattedWeekly,
    ...formattedDaily,
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const formattedResults = allLoans.map((loan) => ({
    _id: loan._id,
    loanNumber: loan.loanNumber,
    customerName: loan.customerName,
    mobileNumber: loan.mobileNumbers && loan.mobileNumbers.length > 0 ? loan.mobileNumbers[0] : "N/A",
    loanAmount: loan.loanAmount,
    type: loan.type,
    date: loan.createdAt,
    createdBy: loan.createdBy ? loan.createdBy.name : "System",
  }));

  sendResponse(
    res,
    200,
    "success",
    "Loans given fetched successfully",
    null,
    formattedResults,
  );
});

module.exports = {
  getCollectionReport,
  getCollectionTransactions,
  getLoansGivenSummary,
};
