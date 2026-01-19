const express = require("express");
const {
  createCustomerLoan,
  getAllCustomers,
  getCustomerByLoanNumber,
  updateCustomer,
  updateEMI,
  getAllEMIDetails,
  getEMIsByLoanId,
} = require("../controllers/customercontroller");
const { isAuthenticated } = require("../middlewares/auth");
const authorizeRoles = require("../middlewares/role");

const router = express.Router();

router.use(isAuthenticated);

router.post("/", authorizeRoles("SUPER_ADMIN"), createCustomerLoan);
router.get("/", authorizeRoles("SUPER_ADMIN", "EMPLOYEE"), getAllCustomers);
router.get(
  "/emi/all",
  authorizeRoles("SUPER_ADMIN", "EMPLOYEE"),
  getAllEMIDetails
);
router.get(
  "/loan-emis/:loanId",
  authorizeRoles("SUPER_ADMIN", "EMPLOYEE"),
  getEMIsByLoanId
);
router.get(
  "/:loanNumber",
  authorizeRoles("SUPER_ADMIN", "EMPLOYEE"),
  getCustomerByLoanNumber
);

router.put("/:id", authorizeRoles("SUPER_ADMIN"), updateCustomer);
router.put("/emi/:id", authorizeRoles("SUPER_ADMIN"), updateEMI);

module.exports = router;
