const express = require("express");
const router = express.Router();
const loanEmiController = require("../controllers/loanEmiController");
const { isAuthenticated } = require("../middlewares/auth");

router.use(isAuthenticated);

router.get("/pending", loanEmiController.getPendingLoans);
router.get("/partial", loanEmiController.getPartialLoans);
router.get("/followups", loanEmiController.getFollowups);
router.put("/client-response/:loanId", loanEmiController.updateClientResponse);
router.put("/complete-followup/:loanId", loanEmiController.completeFollowup);

module.exports = router;
