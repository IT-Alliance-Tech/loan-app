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
} = require("../controllers/loanController");
const {
  getRtoWorks,
  createRtoWork,
} = require("../controllers/rtoWorkController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

router.use(isAuthenticated);

router.get("/rto-works", getRtoWorks);
router.post("/rto-works", createRtoWork);

router
  .route("/")
  .get(getAllLoans)
  .post(authorizeRoles("SUPER_ADMIN"), createLoan);

router.post("/calculate-emi", calculateEMIApi);
router.get(
  "/pending-payments",
  authorizeRoles("SUPER_ADMIN", "EMPLOYEE"),
  getPendingPayments,
);
router.get("/followups", getFollowupLoans);
router.get("/foreclosure", getForeclosureLoans);
router.get("/seized-vehicles", getSeizedVehicles);
router.patch(
  "/seized-vehicles/:id/status",
  authorizeRoles("SUPER_ADMIN"),
  updateSeizedStatus,
);
router.get(
  "/pending-details/:id",
  authorizeRoles("SUPER_ADMIN", "EMPLOYEE"),
  getPendingEmiDetails,
);
router.patch(
  "/:id/payment-status",
  authorizeRoles("SUPER_ADMIN"),
  updatePaymentStatus,
);

router.get("/search/:loanNumber", getLoanByLoanNumber);
router.post("/:id/foreclose", authorizeRoles("SUPER_ADMIN"), forecloseLoan);

router
  .route("/:id")
  .get(getLoanById)
  .put(authorizeRoles("SUPER_ADMIN"), updateLoan);

router.patch("/:id/seized", authorizeRoles("SUPER_ADMIN"), toggleSeizedStatus);

module.exports = router;
