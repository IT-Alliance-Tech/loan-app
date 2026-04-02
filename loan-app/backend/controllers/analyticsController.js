const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const DailyLoan = require("../models/DailyLoan");
const WeeklyLoan = require("../models/WeeklyLoan");
const EMI = require("../models/EMI");
const Expense = require("../models/Expense");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const getAnalyticsStats = asyncHandler(async (req, res, next) => {
  const startTotal = performance.now();

  const [
    loanMetrics,
    dailyMetrics,
    weeklyMetrics,
    expenseStats,
    userStats,
    pendingMetrics,
    partialMetrics,
  ] = await Promise.all([
    // 1. Monthly Loan Metrics (Active & Closed)
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
          processingFees: [
            {
              $group: {
                _id: null,
                total: { $sum: { $ifNull: ["$processingFee", 0] } },
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
                active: {
                  $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
                },
                closed: {
                  $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] },
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
    DailyLoan.aggregate([
      {
        $facet: {
          disbursement: [
            {
              $group: {
                _id: null,
                total: { $sum: "$disbursementAmount" },
                collected: { $sum: "$totalCollected" },
              },
            },
          ],
          counts: [
            {
              $group: {
                _id: null,
                active: {
                  $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
                },
                closed: {
                  $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] },
                },
              },
            },
          ],
        },
      },
    ]),

    // 3. Weekly Loan Metrics
    WeeklyLoan.aggregate([
      {
        $facet: {
          disbursement: [
            {
              $group: {
                _id: null,
                total: { $sum: "$disbursementAmount" },
                collected: { $sum: "$totalCollected" },
              },
            },
          ],
          counts: [
            {
              $group: {
                _id: null,
                active: {
                  $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
                },
                closed: {
                  $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] },
                },
              },
            },
          ],
        },
      },
    ]),

    // 4. EMI Collections & Expenses
    Promise.all([
      EMI.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $add: [
                  { $ifNull: ["$amountPaid", 0] },
                  { $ifNull: [{ $sum: "$overdue.amount" }, 0] },
                ],
              },
            },
          },
        },
      ]),
      Expense.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]),

    // 5. User Roles
    User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]),

    // 6. Pending Counts (Unique loans with at least one Pending EMI)
    EMI.aggregate([
      { $match: { status: "Pending" } },
      { $group: { _id: "$loanId" } },
      { $count: "count" },
    ]),

    // 7. Partial Counts (Unique Monthly Loans with at least one Partially Paid EMI)
    EMI.aggregate([
      { $match: { status: "Partially Paid", loanModel: "Loan" } },
      { $group: { _id: "$loanId" } },
      { $count: "count" },
    ]),
  ]);

  // Destructure Results
  const lMain = loanMetrics[0];
  const lDaily = dailyMetrics[0];
  const lWeekly = weeklyMetrics[0];
  const [emiResults, expenseResults] = expenseStats;
  const pendingCount = pendingMetrics[0]?.count || 0;
  const partialCount = partialMetrics[0]?.count || 0;

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
    (lMain.sold[0]?.total || 0) +
    (lMain.processingFees[0]?.total || 0);

  const activeLoansCount =
    (lMain.counts[0]?.active || 0) +
    (lDaily.counts[0]?.active || 0) +
    (lWeekly.counts[0]?.active || 0);

  const closedLoansCount =
    (lMain.counts[0]?.closed || 0) +
    (lDaily.counts[0]?.closed || 0) +
    (lWeekly.counts[0]?.closed || 0);

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

  const statsResponse = {
    cards: {
      totalLoanAmount,
      totalCollectedAmount,
      pendingLoansCount: pendingCount,
      partialLoansCount: partialCount,
      activeLoansCount,
      closedLoansCount,
      totalExpenses,
      userCounts: userData,
    },
    vehicleStats: Object.keys(vehicleData).map((key) => ({
      name: key,
      value: vehicleData[key],
    })),
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
