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
} = require("../controllers/loanController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

router.use(isAuthenticated);

router
  .route("/")
  .get(getAllLoans)
  .post(authorizeRoles("SUPER_ADMIN"), createLoan);

router.post("/calculate-emi", calculateEMIApi);

router.get("/search/:loanNumber", getLoanByLoanNumber);

router
  .route("/:id")
  .get(getLoanById)
  .put(authorizeRoles("SUPER_ADMIN"), updateLoan);

router.patch("/:id/seized", authorizeRoles("SUPER_ADMIN"), toggleSeizedStatus);

module.exports = router;
