const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const DailyLoan = require("../models/DailyLoan");
const WeeklyLoan = require("../models/WeeklyLoan");
const EMI = require("../models/EMI");
const Expense = require("../models/Expense");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const InterestLoan = require("../models/InterestLoan");
const InterestEMI = require("../models/InterestEMI");

const getAnalyticsStats = asyncHandler(async (req, res, next) => {
  const startTotal = performance.now();

  const [
    loanMetrics,
    dailyMetrics,
    weeklyMetrics,
    interestMetrics,
    expenseStats,
    userStats,
    pendingMetrics,
    partialMetrics,
  ] = await Promise.all([
    // 1. Monthly Loan Metrics
    Loan.aggregate([
      {
        $facet: {
          disbursement: [{ $group: { _id: null, total: { $sum: "$principalAmount" } } }],
          foreclosure: [{ $group: { _id: null, total: { $sum: { $ifNull: ["$foreclosureAmount", 0] } } } }],
          processingFees: [{ $group: { _id: null, total: { $sum: { $ifNull: ["$processingFee", 0] } } } }],
          sold: [{ $group: { _id: null, total: { $sum: { $ifNull: ["$soldDetails.totalAmount", "$soldDetails.sellAmount", 0] } } } }],
          counts: [{ $group: { _id: null, active: { $sum: { $cond: [{ $and: [{ $ne: ["$status", "Closed"] }, { $ne: ["$seizedStatus", "Sold"] }] }, 1, 0] } }, closed: { $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] } } } }],
          vehicleStatus: [{ $match: { isSeized: true } }, { $group: { _id: { $switch: { branches: [{ case: { $eq: ["$seizedStatus", "Seized"] }, then: "Seized" }, { case: { $eq: ["$seizedStatus", "Sold"] }, then: "Sold" }], default: "For Seizing" } }, count: { $sum: 1 } } }],
        }
      }
    ]),

    // 2. Daily Loan Metrics
    DailyLoan.aggregate([
      {
        $facet: {
          disbursement: [{ $group: { _id: null, total: { $sum: "$disbursementAmount" }, collected: { $sum: "$totalCollected" } } }],
          counts: [{ $group: { _id: null, active: { $sum: { $cond: [{ $ne: ["$status", "Closed"] }, 1, 0] } }, closed: { $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] } } } }],
        }
      }
    ]),

    // 3. Weekly Loan Metrics
    WeeklyLoan.aggregate([
      {
        $facet: {
          disbursement: [{ $group: { _id: null, total: { $sum: "$disbursementAmount" }, collected: { $sum: "$totalCollected" } } }],
          counts: [{ $group: { _id: null, active: { $sum: { $cond: [{ $ne: ["$status", "Closed"] }, 1, 0] } }, closed: { $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] } } } }],
        }
      }
    ]),

    // 4. Interest Loan Metrics
    InterestLoan.aggregate([
      {
        $facet: {
          disbursement: [{ $group: { _id: null, total: { $sum: "$initialPrincipalAmount" }, processingFees: { $sum: "$processingFee" } } }],
          principalCollected: [{ $group: { _id: null, total: { $sum: { $sum: "$principalPayments.amount" } } } }],
          counts: [{ $group: { _id: null, active: { $sum: { $cond: [{ $ne: ["$status", "Closed"] }, 1, 0] }, }, closed: { $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] } } } }],
        }
      }
    ]),

    // 5. EMI Collections (Monthly + Interest) & Expenses
    Promise.all([
      EMI.aggregate([
        { $match: { loanModel: "Loan" } },
        { $group: { _id: null, total: { $sum: { $add: [{ $ifNull: ["$amountPaid", 0] }, { $ifNull: [{ $sum: "$overdue.amount" }, 0] }] } } } }
      ]),
      InterestEMI.aggregate([
        { $group: { _id: null, total: { $sum: { $add: [{ $ifNull: ["$amountPaid", 0] }, { $ifNull: [{ $sum: "$overdue.amount" }, 0] }] } } } }
      ]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]),

    // 6. User Roles
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),

    // 7. Pending Collections (Monthly + Daily + Weekly + Interest)
    // We'll approximate this from existing collections or do separate counts
    EMI.aggregate([{ $match: { status: "Pending" } }, { $group: { _id: "$loanId" } }, { $count: "count" }]),
    
    // 8. Partial Counts
    EMI.aggregate([{ $match: { status: "Partially Paid", loanModel: "Loan" } }, { $group: { _id: "$loanId" } }, { $count: "count" }]),
  ]);

  // Destructure with default empty objects
  const mMain = loanMetrics[0] || {};
  const mDaily = dailyMetrics[0] || {};
  const mWeekly = weeklyMetrics[0] || {};
  const mInterest = interestMetrics[0] || {};
  const [emiMonthlyArr, emiInterestArr, expenseResultsArr] = expenseStats || [[], [], []];
  
  // Safe extraction helper
  const getSum = (arr, field = "total") => arr && arr[0] ? (arr[0][field] || 0) : 0;

  // Disbursement Breakdown
  const monthlyDisbursed = Math.ceil(getSum(mMain.disbursement));
  const dailyDisbursed = Math.ceil(getSum(mDaily.disbursement));
  const weeklyDisbursed = Math.ceil(getSum(mWeekly.disbursement));
  const interestDisbursed = Math.ceil(getSum(mInterest.disbursement));
  const totalLoanAmount = monthlyDisbursed + dailyDisbursed + weeklyDisbursed + interestDisbursed;

  // Collection Breakdown
  const monthlyCollected = Math.ceil(
    getSum(emiMonthlyArr) + 
    getSum(mMain.foreclosure) + 
    getSum(mMain.sold) + 
    getSum(mMain.processingFees)
  );
  const dailyCollected = Math.ceil(getSum(mDaily.disbursement, "collected"));
  const weeklyCollected = Math.ceil(getSum(mWeekly.disbursement, "collected"));
  const interestCollected = Math.ceil(
    getSum(emiInterestArr) + 
    getSum(mInterest.principalCollected) + 
    getSum(mInterest.disbursement, "processingFees")
  );
  const totalCollectedAmount = monthlyCollected + dailyCollected + weeklyCollected + interestCollected;

  // Global Counts
  const activeLoansCount = 
    (getSum(mMain.counts, "active")) + 
    (getSum(mDaily.counts, "active")) + 
    (getSum(mWeekly.counts, "active")) + 
    (getSum(mInterest.counts, "active"));

  const closedLoansCount = 
    (getSum(mMain.counts, "closed")) + 
    (getSum(mDaily.counts, "closed")) + 
    (getSum(mWeekly.counts, "closed")) + 
    (getSum(mInterest.counts, "closed"));

  const totalExpenses = Math.ceil(getSum(expenseResultsArr));

  // Format Vehicle Data
  const vehicleData = { "For Seizing": 0, Seized: 0, Sold: 0 };
  if (mMain.vehicleStatus) {
    mMain.vehicleStatus.forEach(s => { 
      if (s._id) vehicleData[s._id] = s.count || 0; 
    });
  }

  // Format User Data
  const userData = { SUPER_ADMIN: 0, ADMIN: 0, EMPLOYEE: 0 };
  if (userStats) {
    userStats.forEach(s => { 
      if (s._id) userData[s._id] = s.count || 0; 
    });
  }

  const duration = (performance.now() - startTotal).toFixed(2);

  const statsResponse = {
    cards: {
      totalLoanAmount,
      totalCollectedAmount,
      disbursementBreakdown: {
        monthly: monthlyDisbursed,
        daily: dailyDisbursed,
        weekly: weeklyDisbursed,
        interest: interestDisbursed
      },
      collectedBreakdown: {
        monthly: monthlyCollected,
        daily: dailyCollected,
        weekly: weeklyCollected,
        interest: interestCollected
      },
      pendingLoansCount: pendingMetrics[0]?.count || 0,
      partialLoansCount: partialMetrics[0]?.count || 0,
      activeLoansCount,
      closedLoansCount,
      totalExpenses,
      userCounts: userData,
    },
    vehicleStats: Object.keys(vehicleData).map(key => ({ name: key, value: vehicleData[key] })),
    performance: { totalTime: `${duration}ms` },
  };

  sendResponse(
    res,
    200,
    "success",
    "Analytics stats fetched successfully",
    null,
    statsResponse,
  );
});

module.exports = {
  getAnalyticsStats,
};
