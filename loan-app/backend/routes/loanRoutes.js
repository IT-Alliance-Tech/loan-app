const express = require("express");
const router = express.Router();
const {
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
  getSeizedVehicles,
  updateSeizedStatus,
  getAnalyticsStats,
} = require("../controllers/loanController");
const {
  getRtoWorks,
  createRtoWork,
} = require("../controllers/rtoWorkController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

router.get("/health", (req, res) =>
  res.json({ status: "ok", version: "v4-deployment-test" }),
);
router.get("/analytics/stats", getAnalyticsStats);

router.use(isAuthenticated);

router.get("/rto-works", getRtoWorks);
router.post("/rto-works", createRtoWork);

router
  .route("/")
  .get(getAllLoans)
  .post(authorizeRoles("SUPER_ADMIN", "ADMIN"), createLoan);

router.post("/calculate-emi", calculateEMIApi);
router.get(
  "/pending-payments",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getPendingPayments,
);
router.get("/followups", getFollowupLoans);
router.get("/foreclosure", getForeclosureLoans);
router.get("/seized-vehicles", getSeizedVehicles);
router.patch(
  "/seized-vehicles/:id/status",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  updateSeizedStatus,
);
router.get(
  "/pending-details/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getPendingEmiDetails,
);
router.patch(
  "/:id/payment-status",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  updatePaymentStatus,
);

router.get("/search/:loanNumber", getLoanByLoanNumber);
router.post(
  "/:id/foreclose",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  forecloseLoan,
);

router
  .route("/:id")
  .get(getLoanById)
  .put(authorizeRoles("SUPER_ADMIN", "ADMIN"), updateLoan);

router.patch(
  "/:id/seized",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  toggleSeizedStatus,
);

module.exports = router;
