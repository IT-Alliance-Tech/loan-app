const express = require("express");
const router = express.Router();
const {
  createInterestLoan,
  getAllInterestLoans,
  getInterestLoanById,
  updateInterestLoan,
  deleteInterestLoan,
  addPrincipalPayment,
  payInterestEMI,
  getInterestPendingPayments,
} = require("../controllers/interestLoanController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

router.use(isAuthenticated);

router.route("/")
  .get(getAllInterestLoans)
  .post(createInterestLoan);

router.route("/pending").get(getInterestPendingPayments);

router.route("/:id")
  .get(getInterestLoanById)
  .put(updateInterestLoan)
  .delete(authorizeRoles("SUPER_ADMIN"), deleteInterestLoan);

router.route("/:id/principal-payment").post(addPrincipalPayment);
router.route("/emi/:id/pay").put(payInterestEMI);

module.exports = router;
