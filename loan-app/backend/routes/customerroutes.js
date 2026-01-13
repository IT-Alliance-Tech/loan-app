const express = require("express");
const {
  createCustomerLoan,
  getAllCustomers,
  getCustomerByLoanNumber,
} = require("../controllers/customercontroller");
const { isAuthenticated } = require("../middlewares/auth");
const authorizeRoles = require("../middlewares/role");

const router = express.Router();

router.use(isAuthenticated);

router.post("/", authorizeRoles("SUPER_ADMIN"), createCustomerLoan);
router.get("/", authorizeRoles("SUPER_ADMIN", "EMPLOYEE"), getAllCustomers);
router.get(
  "/:loanNumber",
  authorizeRoles("SUPER_ADMIN", "EMPLOYEE"),
  getCustomerByLoanNumber
);

module.exports = router;
