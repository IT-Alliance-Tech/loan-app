const express = require("express");
const router = express.Router();
const {
  createWeeklyLoan,
  getAllWeeklyLoans,
  getWeeklyLoanById,
  updateWeeklyLoan,
  deleteWeeklyLoan,
  getWeeklyLoanEMIs,
  getWeeklyPendingPayments,
  getWeeklyFollowupLoans,
  getWeeklyPendingEmiDetails,
} = require("../controllers/weeklyLoanController");
const { updateFollowup } = require("../controllers/loanController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

router.use(isAuthenticated);

router.get("/pending-payments", getWeeklyPendingPayments);
router.get("/followup-payments", getWeeklyFollowupLoans);
router.get("/pending-details/:id", getWeeklyPendingEmiDetails);
router.patch(
  "/update-followup/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  updateFollowup,
);

router
  .route("/")
  .get(getAllWeeklyLoans)
  .post(authorizeRoles("SUPER_ADMIN", "ADMIN"), createWeeklyLoan);

router
  .route("/:id")
  .get(getWeeklyLoanById)
  .put(authorizeRoles("SUPER_ADMIN", "ADMIN"), updateWeeklyLoan)
  .delete(authorizeRoles("SUPER_ADMIN", "ADMIN"), deleteWeeklyLoan);

router.get("/emis/:id", getWeeklyLoanEMIs);

module.exports = router;
