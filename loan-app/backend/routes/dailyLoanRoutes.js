const express = require("express");
const {
  createDailyLoan,
  getAllDailyLoans,
  getDailyLoanById,
  updateDailyLoan,
  deleteDailyLoan,
  getDailyLoanEMIs,
  getDailyPendingPayments,
  getDailyFollowupLoans,
  getDailyPendingEmiDetails,
} = require("../controllers/dailyLoanController");
const { isAuthenticated } = require("../middlewares/auth");
const authorizeRoles = require("../middlewares/role");

const router = express.Router();

router.use(isAuthenticated);

router.post("/", authorizeRoles("SUPER_ADMIN", "ADMIN"), createDailyLoan);
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getAllDailyLoans,
);
router.get(
  "/pending-payments",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getDailyPendingPayments,
);
router.get(
  "/followup-payments",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getDailyFollowupLoans,
);
router.get(
  "/pending-details/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getDailyPendingEmiDetails,
);
router.get(
  "/emis/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getDailyLoanEMIs,
);
router.get(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  getDailyLoanById,
);
router.put("/:id", authorizeRoles("SUPER_ADMIN", "ADMIN"), updateDailyLoan);
router.delete("/:id", authorizeRoles("SUPER_ADMIN", "ADMIN"), deleteDailyLoan);

module.exports = router;
