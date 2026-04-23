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
const Payment = require("../models/Payment");

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

  // Disbursement Breakdown by Mode
  const getDisbursementModes = (loanMetrics) => {
    let cash = 0;
    let account = 0;
    
    // Monthly
    const mDisArr = loanMetrics[0]?.disbursement || [];
    const mainMode = loanMetrics[0]?.paymentMode || "Cash";
    if (mDisArr.length > 0) {
      mDisArr.forEach(d => {
        if ((d.mode || mainMode) === "Cash") cash += (d.amount || 0);
        else account += (d.amount || 0);
      });
    } else {
      const pAmt = loanMetrics[0]?.principalAmount || 0;
      if (mainMode === "Cash") cash += pAmt;
      else account += pAmt;
    }

    // Daily/Weekly/Interest
    const processLoan = (loan) => {
      const disb = loan.disbursement || [];
      const mode = loan.paymentMode || "Cash";
      if (disb.length > 0) {
        disb.forEach(d => {
          if ((d.mode || mode) === "Cash") cash += (d.amount || 0);
          else account += (d.amount || 0);
        });
      } else {
        const amt = loan.disbursementAmount || loan.initialPrincipalAmount || 0;
        if (mode === "Cash") cash += amt;
        else account += amt;
      }
    };

    return { cash, account };
  };

  // We need more granular aggregation for modes. Let's do a direct aggregate on Payment
  const [collectionModes] = await Promise.all([
    Payment.aggregate([
      {
        $group: {
          _id: { 
            $cond: [
              { $eq: ["$mode", "Cash"] }, 
              "cash", 
              "account"
            ]
          },
          total: { $sum: "$totalAmount" }
        }
      }
    ])
  ]);

  // Aggregate disbursement modes across all models
  const [dMonthly, dDaily, dWeekly, dInterest] = await Promise.all([
    Loan.find({}, "disbursement paymentMode principalAmount"),
    DailyLoan.find({}, "disbursement paymentMode disbursementAmount"),
    WeeklyLoan.find({}, "disbursement paymentMode disbursementAmount"),
    InterestLoan.find({}, "disbursement paymentMode initialPrincipalAmount"),
  ]);

  const calcD = (loans, amtField) => {
    let c = 0; let a = 0;
    loans.forEach(l => {
      if (l.disbursement?.length > 0) {
        l.disbursement.forEach(d => {
          if (d.mode === "Cash") c += d.amount;
          else a += d.amount;
        });
      } else {
        if (l.paymentMode === "Cash") c += (l[amtField] || 0);
        else a += (l[amtField] || 0);
      }
    });
    return { c, a };
  };

  const mD = calcD(dMonthly, "principalAmount");
  const dD = calcD(dDaily, "disbursementAmount");
  const wD = calcD(dWeekly, "disbursementAmount");
  const iD = calcD(dInterest, "initialPrincipalAmount");

  const disByMode = {
    cash: Math.ceil(mD.c + dD.c + wD.c + iD.c),
    account: Math.ceil(mD.a + dD.a + wD.a + iD.a)
  };

  const collByMode = { cash: 0, account: 0 };
  collectionModes.forEach(m => {
    if (m._id === "account") collByMode.account = Math.ceil(m.total);
    else collByMode.cash += Math.ceil(m.total);
  });

  // Reconcile with totalCollectedAmount to ensure consistency with main cards
  // Any amount not explicitly recorded as 'Account' in Payment model is treated as 'Cash'
  const finalCollCash = Math.max(0, totalCollectedAmount - collByMode.account);

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
      paymentModeStats: {
        disbursement: {
          cash: disByMode.cash,
          account: disByMode.account,
          total: totalLoanAmount // Use totalLoanAmount for absolute consistency 
        },
        collection: {
          cash: finalCollCash,
          account: collByMode.account,
          total: totalCollectedAmount // Match main cards exactly
        }
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

const exportAllData = asyncHandler(async (req, res, next) => {
  const [
    monthlyLoans,
    dailyLoans,
    weeklyLoans,
    interestLoans,
    expenses
  ] = await Promise.all([
    Loan.find().sort({ createdAt: -1 }).lean(),
    DailyLoan.find().sort({ createdAt: -1 }).lean(),
    WeeklyLoan.find().sort({ createdAt: -1 }).lean(),
    InterestLoan.find().sort({ createdAt: -1 }).lean(),
    Expense.find().sort({ date: -1 }).lean(),
  ]);

  sendResponse(res, 200, "success", "Export data fetched successfully", null, {
    monthlyLoans,
    dailyLoans,
    weeklyLoans,
    interestLoans,
    expenses
  });
});

const getTrendStats = asyncHandler(async (req, res, next) => {
  try {
    const { range = "max", interval = "all", startDate: customStart, endDate: customEnd } = req.query;

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(now);

    let groupFormat = "%Y-%m"; // Default Monthly

    // Handle User's specific Filter Logic
    if (interval === "daily") {
      // "show today only"
      startDate.setHours(0, 0, 0, 0);
      groupFormat = "%Y-%m-%d %H:00"; // Hourly view for today
    } else if (interval === "weekly") {
      // "7 days trends"
      startDate.setDate(now.getDate() - 7);
      groupFormat = "%Y-%m-%d";
    } else if (interval === "monthly") {
      // "past month trend only"
      startDate.setMonth(now.getMonth() - 1);
      groupFormat = "%Y-%m-%d";
    } else if (interval === "yearly") {
      // "same for year also"
      startDate.setFullYear(now.getFullYear() - 1);
      groupFormat = "%Y-%m";
    } else if (interval === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
      // Decide group format based on duration
      const diffDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
      if (diffDays <= 2) groupFormat = "%Y-%m-%d %H:00";
      else if (diffDays <= 60) groupFormat = "%Y-%m-%d";
      else groupFormat = "%Y-%m";
    } else {
      // Default / Max view
      startDate = new Date(0); // All time
      groupFormat = "%Y-%m";
    }

    // 1. Collections
    const collectionStats = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startDate, $lte: endDate }, status: "Success" } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$paymentDate" } },
          total: { $sum: "$amount" }
        }
      }
    ]);

    // 2. Disbursements
    const aggregateModelDisbursements = async (Model, amountField, dateFields) => {
      return Model.aggregate([
        {
          $project: {
            disbursements: {
              $cond: {
                if: { $and: [{ $isArray: "$disbursement" }, { $gt: [{ $size: "$disbursement" }, 0] }] },
                then: "$disbursement",
                else: [{ amount: { $ifNull: [`$${amountField}`, 0] }, date: { $ifNull: [...dateFields.map(f => `$${f}`), "$createdAt"] } }]
              }
            }
          }
        },
        { $unwind: "$disbursements" },
        { $match: { "disbursements.date": { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat, date: "$disbursements.date" } },
            total: { $sum: "$disbursements.amount" }
          }
        }
      ]);
    };

    const disResults = await Promise.all([
      aggregateModelDisbursements(Loan, "principalAmount", ["dateLoanDisbursed", "emiStartDate"]),
      aggregateModelDisbursements(DailyLoan, "disbursementAmount", ["dateLoanDisbursed", "startDate"]),
      aggregateModelDisbursements(WeeklyLoan, "disbursementAmount", ["dateLoanDisbursed", "startDate"]),
      aggregateModelDisbursements(InterestLoan, "initialPrincipalAmount", ["startDate"]),
    ]);

    const disbursementMap = {};
    disResults.flat().forEach(item => {
      if (item._id) disbursementMap[item._id] = (disbursementMap[item._id] || 0) + item.total;
    });

    const collectionMap = {};
    collectionStats.forEach(item => {
      if (item._id) collectionMap[item._id] = item.total;
    });

    let allDates = [...new Set([...Object.keys(disbursementMap), ...Object.keys(collectionMap)])].sort();

    const trendData = [];
    let runningDisbursement = 0;
    let runningCollection = 0;

    // For today view or very short ranges, we might have few points.
    allDates.forEach(date => {
      const dVal = Math.round(disbursementMap[date] || 0);
      const cVal = Math.round(collectionMap[date] || 0);
      runningDisbursement += dVal;
      runningCollection += cVal;

      trendData.push({
        date,
        disbursement: dVal,
        collection: cVal,
        cumulativeDisbursement: runningDisbursement,
        cumulativeCollection: runningCollection
      });
    });

    sendResponse(res, 200, "success", "Trend stats fetched successfully", null, trendData);
  } catch (error) {
    console.error("Error in getTrendStats:", error);
    next(error);
  }
});

module.exports = {
  getAnalyticsStats,
  exportAllData,
  getTrendStats,
};
