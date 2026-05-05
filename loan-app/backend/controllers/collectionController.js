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

  // 1. Group transactions to handle reversals/edits (same loan, same emi, same day)
  const aggregation = [
    { $match: match },
    {
      $group: {
        _id: {
          loanId: "$loanId",
          emiId: "$emiId",
          paymentDate: "$paymentDate",
          paymentType: "$paymentType"
        },
        emiAmount: { $sum: "$emiAmount" },
        overdueAmount: { $sum: "$overdueAmount" },
        // Fallback: Use amount if totalAmount is 0 or missing
        totalAmountSum: { 
          $sum: { 
            $cond: [
              { $gt: [{ $ifNull: ["$totalAmount", 0] }, 0] },
              "$totalAmount",
              { 
                $cond: [
                  { $gt: [{ $ifNull: ["$amount", 0] }, 0] },
                  "$amount",
                  { $ifNull: ["$overdueAmount", 0] }
                ]
              }
            ]
          } 
        },
        mode: { $first: "$mode" },
        loanModel: { $first: "$loanModel" },
        collectedBy: { $first: "$collectedBy" },
        createdAt: { $max: "$createdAt" }
      }
    },
    // Standard EMI Lookup
    {
      $lookup: {
        from: "emis",
        localField: "_id.emiId",
        foreignField: "_id",
        as: "standardEmiInfo"
      }
    },
    // Interest EMI Lookup
    {
      $lookup: {
        from: "interestemis",
        localField: "_id.emiId",
        foreignField: "_id",
        as: "interestEmiInfo"
      }
    },
    {
      $addFields: {
        emiDetails: { 
          $ifNull: [
            { $arrayElemAt: ["$standardEmiInfo", 0] },
            { $arrayElemAt: ["$interestEmiInfo", 0] }
          ] 
        }
      }
    },
    // Filter out transactions if the linked EMI has amountPaid == 0
    {
      $match: {
        $or: [
          { "_id.emiId": { $exists: false } },
          { "_id.emiId": null },
          {
            $and: [
              { "emiDetails": { $ne: null } },
              { "emiDetails.amountPaid": { $nin: [0, "0", null, ""] } }
            ]
          }
        ]
      }
    },
    { $sort: { "_id.paymentDate": -1, createdAt: -1 } }
  ];

  // Get total count and grand total amount
  const summaryAgg = await Payment.aggregate([
    ...aggregation,
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        grandTotalAmount: { $sum: "$totalAmountSum" }
      }
    }
  ]);

  const total = summaryAgg[0]?.totalCount || 0;
  const grandTotalAmount = summaryAgg[0]?.grandTotalAmount || 0;

  // Get paginated results
  const transactions = await Payment.aggregate([
    ...aggregation,
    { $skip: skip },
    { $limit: limitNum },
    {
      $lookup: {
        from: "users",
        localField: "collectedBy",
        foreignField: "_id",
        as: "collectorInfo"
      }
    },
    {
      $lookup: {
        from: "loans",
        localField: "_id.loanId",
        foreignField: "_id",
        as: "monthlyLoanInfo"
      }
    },
    {
      $lookup: {
        from: "weeklyloans",
        localField: "_id.loanId",
        foreignField: "_id",
        as: "weeklyLoanInfo"
      }
    },
    {
      $lookup: {
        from: "dailyloans",
        localField: "_id.loanId",
        foreignField: "_id",
        as: "dailyLoanInfo"
      }
    },
    {
      $addFields: {
        collector: { $arrayElemAt: ["$collectorInfo", 0] },
        loanFallback: {
          $ifNull: [
            { $arrayElemAt: ["$monthlyLoanInfo", 0] },
            { 
              $ifNull: [
                { $arrayElemAt: ["$weeklyLoanInfo", 0] },
                { $arrayElemAt: ["$dailyLoanInfo", 0] }
              ]
            }
          ]
        }
      }
    }
  ]);

  // Format the output
  const formattedTransactions = transactions.map((txn) => {
    const totalAmt = txn.totalAmountSum || 0;
    const emiAmt = txn.emiAmount || (txn._id.paymentType === "Interest" ? totalAmt : 0);
    
    return {
      _id: txn._id,
      loanId: txn._id.loanId,
      loanModel: txn.loanModel,
      loanNumber: txn.emiDetails?.loanNumber || txn.loanFallback?.loanNumber || "Unknown",
      emiNo: txn.emiDetails?.emiNumber || (txn.emiDetails?.emiNo || "-"),
      customerName: txn.emiDetails?.customerName || txn.loanFallback?.customerName || "Unknown",
      emiAmount: emiAmt,
      overdueAmount: txn.overdueAmount || 0,
      totalAmount: totalAmt,
      amount: totalAmt,
      paymentMode: txn.mode,
      paymentType: txn.paymentType || txn._id.paymentType,
      date: txn._id.paymentDate,
      updatedBy: txn.collector ? txn.collector.name : "System",
    };
  });

  sendResponse(
    res,
    200,
    "success",
    "Collection transactions fetched successfully",
    null,
    {
      transactions: formattedTransactions,
      totalCollectedAmount: transactions.reduce((acc, curr) => acc + (curr.totalAmountSum || 0), 0),
      summary: {
        totalAmount: grandTotalAmount
      },
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
    summary: {
      totalAmount: allLoansRaw.reduce((sum, l) => sum + (l.amount || 0), 0)
    },
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
