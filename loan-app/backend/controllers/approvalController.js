const Approval = require("../models/Approval");
const EMI = require("../models/EMI");
const InterestEMI = require("../models/InterestEMI");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const InterestLoan = require("../models/InterestLoan");
const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");
const { sendNotification } = require("./notificationController");

// List all pending approvals (Super Admin only)
const getPendingApprovals = asyncHandler(async (req, res, next) => {
  const approvals = await Approval.find({ status: "Pending" })
    .populate("requestedBy", "name")
    .sort({ createdAt: -1 });

  sendResponse(res, 200, "success", "Pending approvals fetched", null, approvals);
});

// Process an approval request
const processApproval = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, remarks } = req.body; // status: "Approved" or "Rejected"

  if (!["Approved", "Rejected"].includes(status)) {
    return next(new ErrorHandler("Invalid status provided", 400));
  }

  const approval = await Approval.findById(id);
  if (!approval) {
    return next(new ErrorHandler("Approval request not found", 404));
  }

  if (approval.status !== "Pending") {
    return next(new ErrorHandler("Approval request already processed", 400));
  }

  approval.status = status;
  approval.remarks = remarks;
  approval.processedBy = req.user._id;
  approval.processedAt = Date.now();

  if (status === "Approved") {
    const { targetId, targetModel, requestedData, requestType } = approval;
    const Payment = require("../models/Payment");

    if (requestType === "EMI_PAYMENT") {
      const emi = await EMI.findById(targetId);
      if (emi) {
        const { remarks, dateGroups, overdue } = requestedData;
        const oldHistory = emi.paymentHistory ? JSON.parse(JSON.stringify(emi.paymentHistory)) : [];
        
        if (dateGroups && Array.isArray(dateGroups)) {
          emi.paymentHistory = [];
          for (const group of dateGroups) {
            if (group.date && group.payments) {
              for (const p of group.payments) {
                const amount = parseFloat(p.amount);
                if (amount > 0) {
                  const paymentDate = new Date(group.date);
                  
                  // Check if this specific payment entry already exists in history to avoid duplicates in Payment collection
                  const isAlreadyRecorded = oldHistory.some(oh => 
                    oh.mode === p.mode && 
                    parseFloat(oh.amount) === amount && 
                    new Date(oh.date).toISOString().split('T')[0] === group.date
                  );

                  emi.paymentHistory.push({
                    amount,
                    mode: p.mode || "Cash",
                    chequeNumber: p.chequeNumber || "",
                    date: paymentDate,
                    addedBy: approval.requestedBy,
                  });

                  // ONLY create a Payment record if it's new
                  if (!isAlreadyRecorded) {
                    let pType = "Monthly";
                    if (emi.loanModel === "DailyLoan") pType = "Daily";
                    else if (emi.loanModel === "WeeklyLoan") pType = "Weekly";

                    await Payment.create({
                      emiId: emi._id,
                      loanId: emi.loanId,
                      loanModel: emi.loanModel || "Loan",
                      amount: amount,
                      emiAmount: amount, // Categorize as EMI amount
                      totalAmount: amount,
                      mode: p.mode || "Cash",
                      chequeNumber: p.chequeNumber || "",
                      paymentDate: paymentDate,
                      paymentType: pType,
                      status: "Success",
                      remarks: remarks || "",
                      collectedBy: approval.requestedBy,
                    });
                  }
                }
              }
            }
          }
        }

        if (overdue !== undefined && Array.isArray(overdue)) {
            const oldOverdue = emi.overdue ? JSON.parse(JSON.stringify(emi.overdue)) : [];
            
            // Create Payment records for new overdue entries
            for (const ov of overdue) {
              const amount = parseFloat(ov.amount);
              if (amount > 0 && ov.date) {
                const ovDateStr = new Date(ov.date).toISOString().split('T')[0];
                const isAlreadyRecorded = oldOverdue.some(oov => 
                   oov.mode === ov.mode && 
                   parseFloat(oov.amount) === amount && 
                   new Date(oov.date).toISOString().split('T')[0] === ovDateStr
                );

                if (!isAlreadyRecorded) {
                   await Payment.create({
                      emiId: emi._id,
                      loanId: emi.loanId,
                      loanModel: emi.loanModel || "Loan",
                      amount: amount,
                      overdueAmount: amount, // Categorize as Overdue amount
                      totalAmount: amount,
                      mode: ov.mode || "Cash",
                      chequeNumber: ov.chequeNumber || "",
                      paymentDate: new Date(ov.date),
                      paymentType: "Overdue",
                      status: "Success",
                      remarks: "Overdue Payment Approved",
                      collectedBy: approval.requestedBy,
                   });
                }
              }
            }
            emi.overdue = overdue;
        }

        const newAmountPaid = emi.paymentHistory.reduce((acc, curr) => acc + curr.amount, 0);
        emi.amountPaid = newAmountPaid;
        emi.paymentMode = [...new Set(emi.paymentHistory.map(ph => ph.mode))].filter(Boolean).join(", ");

        if (emi.amountPaid >= emi.emiAmount) {
          emi.status = "Paid";
          emi.paymentDate = emi.paymentHistory.length > 0 ? emi.paymentHistory[emi.paymentHistory.length - 1].date : new Date();
        } else if (emi.amountPaid > 0) {
          emi.status = "Partially Paid";
        } else {
          emi.status = "Pending";
        }

        emi.remarks = remarks;
        emi.approvedBy = req.user._id;
        emi.approvedAt = Date.now();
        await emi.save();
      }
    } else if (requestType === "INTEREST_PAYMENT") {
      const emi = await InterestEMI.findById(targetId);
      if (emi) {
        const { remarks, dateGroups, overdue } = requestedData;
        const oldHistory = emi.paymentHistory ? JSON.parse(JSON.stringify(emi.paymentHistory)) : [];

        if (dateGroups && Array.isArray(dateGroups)) {
          emi.paymentHistory = [];
          for (const group of dateGroups) {
            if (group.date && group.payments) {
              for (const p of group.payments) {
                const amount = parseFloat(p.amount);
                if (amount > 0) {
                  const paymentDate = new Date(group.date);

                  // Check if this specific payment entry already exists in history to avoid duplicates in Payment collection
                  const isAlreadyRecorded = oldHistory.some(oh => 
                    oh.mode === p.mode && 
                    parseFloat(oh.amount) === amount && 
                    new Date(oh.date).toISOString().split('T')[0] === group.date
                  );

                  emi.paymentHistory.push({
                    amount,
                    mode: p.mode || "Cash",
                    chequeNumber: p.chequeNumber || "",
                    date: paymentDate,
                    addedBy: approval.requestedBy,
                  });

                  if (!isAlreadyRecorded) {
                    await Payment.create({
                      emiId: emi._id,
                      loanId: emi.interestLoanId,
                      loanModel: "InterestLoan",
                      amount: amount,
                      emiAmount: amount, // Categorize as EMI amount (Interest)
                      totalAmount: amount,
                      mode: p.mode || "Cash",
                      chequeNumber: p.chequeNumber || "",
                      paymentDate: paymentDate,
                      paymentType: "Interest",
                      status: "Success",
                      remarks: remarks || "",
                      collectedBy: approval.requestedBy,
                    });
                  }
                }
              }
            }
          }
        }

        if (overdue !== undefined && Array.isArray(overdue)) {
            const oldOverdue = emi.overdue ? JSON.parse(JSON.stringify(emi.overdue)) : [];
            
            for (const ov of overdue) {
              const amount = parseFloat(ov.amount);
              if (amount > 0 && ov.date) {
                const ovDateStr = new Date(ov.date).toISOString().split('T')[0];
                const isAlreadyRecorded = oldOverdue.some(oov => 
                   oov.mode === ov.mode && 
                   parseFloat(oov.amount) === amount && 
                   new Date(oov.date).toISOString().split('T')[0] === ovDateStr
                );

                if (!isAlreadyRecorded) {
                   await Payment.create({
                      emiId: emi._id,
                      loanId: emi.interestLoanId,
                      loanModel: "InterestLoan",
                      amount: amount,
                      overdueAmount: amount,
                      totalAmount: amount,
                      mode: ov.mode || "Cash",
                      chequeNumber: ov.chequeNumber || "",
                      paymentDate: new Date(ov.date),
                      paymentType: "Overdue",
                      status: "Success",
                      remarks: "Overdue Interest Payment Approved",
                      collectedBy: approval.requestedBy,
                   });
                }
              }
            }
            emi.overdue = overdue;
        }

        const newAmountPaid = emi.paymentHistory.reduce((acc, curr) => acc + curr.amount, 0);
        emi.paymentMode = [...new Set(emi.paymentHistory.map(ph => ph.mode))].filter(Boolean).join(", ");
        emi.amountPaid = newAmountPaid;

        if (emi.amountPaid >= emi.interestAmount) {
          emi.status = "Paid";
          emi.paymentDate = emi.paymentHistory.length > 0 ? emi.paymentHistory[emi.paymentHistory.length - 1].date : new Date();
        } else if (emi.amountPaid > 0) {
          emi.status = "Partially Paid";
        } else {
          emi.status = "Pending";
        }
        
        emi.remarks = remarks;
        emi.approvedBy = req.user._id;
        emi.approvedAt = Date.now();
        await emi.save();
      }
    } else if (requestType === "FORECLOSURE") {
      const loan = await Loan.findById(targetId);
      if (loan) {
        const { remainingPrincipal, totalAmount, paymentBreakdown, paymentDate, remarks, paymentMode, chequeNumber } = requestedData;
        const pDate = paymentDate ? new Date(paymentDate) : new Date();
        const pMode = (paymentBreakdown || []).map(p => p.mode).join(", ") || "CASH";

        loan.status = "Closed";
        loan.paymentStatus = "Closed";
        loan.remarks = remarks || `Foreclosed on ${pDate.toLocaleDateString()}`;
        loan.foreclosedBy = approval.requestedBy;
        loan.foreclosureDate = pDate;
        loan.foreclosureAmount = totalAmount;
        loan.remainingPrincipal = remainingPrincipal;
        loan.paymentMode = paymentMode || "Cash";
        loan.chequeNumber = paymentMode === "Cheque" ? chequeNumber : undefined;
        
        loan.approvedBy = req.user._id;
        loan.approvedAt = Date.now();
        await loan.save();

        await EMI.updateMany(
          { loanId: loan._id, status: { $ne: "Paid" } },
          { 
              $set: { 
                  status: "Paid", 
                  paymentDate: pDate, 
                  paymentMode: pMode, 
                  remarks: `Loan foreclosed. Total: ₹${totalAmount}`,
                  approvedBy: req.user._id,
                  approvedAt: Date.now()
              } 
          }
        );

        if (paymentBreakdown && Array.isArray(paymentBreakdown)) {
          for (const p of paymentBreakdown) {
              let pType = "Monthly";
              if (loan.loanModel === "DailyLoan") pType = "Daily";
              else if (loan.loanModel === "WeeklyLoan") pType = "Weekly";

            await Payment.create({
              loanId: loan._id,
              loanModel: loan.loanModel || "Loan",
              amount: parseFloat(p.amount),
              mode: p.mode,
              paymentDate: pDate,
              paymentType: pType,
              status: "Success",
              remarks: `Foreclosure Split-Payment (${p.mode}) Approved`,
              collectedBy: approval.requestedBy,
            });
          }
        }
      }
    } else if (requestType === "PRINCIPAL_PAYMENT") {
      const loan = await InterestLoan.findById(targetId);
      if (loan) {
        const { amount, paymentMode, paymentDate, remarks } = requestedData;
        const pAmount = parseFloat(amount);

        const pDate = paymentDate ? new Date(paymentDate) : new Date();

        loan.principalPayments.push({
          amount: pAmount,
          paymentMode: paymentMode || "Cash",
          paymentDate: pDate,
          remarks,
          addedBy: approval.requestedBy,
        });

        // Add to collections
        await Payment.create({
          loanId: loan._id,
          loanModel: "InterestLoan",
          amount: pAmount,
          mode: paymentMode || "Cash",
          paymentDate: pDate,
          paymentType: "Monthly", // Categorize as Monthly for collections summary to include it in standard loan repayments
          status: "Success",
          remarks: remarks || "Principal Payment Approved",
          collectedBy: approval.requestedBy,
        });

        loan.remainingPrincipalAmount -= pAmount;
        if (loan.remainingPrincipalAmount <= 0) {
          loan.status = "Closed";
          loan.remainingPrincipalAmount = 0;
        }

        loan.approvedBy = req.user._id;
        loan.approvedAt = Date.now();
        await loan.save();

        // Recalculate future EMIs
        const pendingEmis = await InterestEMI.find({
          interestLoanId: loan._id,
          status: { $in: ["Pending", "Partially Paid"] },
        });

        for (const emi of pendingEmis) {
          const newInterestAmount = Math.ceil(
            loan.remainingPrincipalAmount * (loan.interestRate / 100)
          );
          emi.interestAmount = newInterestAmount;
          if (emi.amountPaid >= emi.interestAmount) emi.status = "Paid";
          else if (emi.amountPaid > 0) emi.status = "Partially Paid";
          else emi.status = "Pending";
          await emi.save();
        }
      }
    }
  } else {
    // If rejected, set the status back to Pending/Active
    const { targetId, targetModel } = approval;
    if (targetModel === "EMI") {
      await EMI.findByIdAndUpdate(targetId, { status: "Pending" });
    } else if (targetModel === "InterestEMI") {
      await InterestEMI.findByIdAndUpdate(targetId, { status: "Pending" });
    } else if (targetModel === "Loan") {
      await Loan.findByIdAndUpdate(targetId, { status: "Active" });
    }
  }

  await approval.save();

  // Notify the employee who requested it
  await sendNotification({
    recipientId: approval.requestedBy,
    senderId: req.user._id,
    type: status === "Approved" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
    title: `Payment Request ${status}`,
    message: `Payment of ₹${approval.requestedData.amount || approval.requestedData.addedAmount || 0} for loan ${approval.loanNumber} (${approval.customerName}) has been ${status.toLowerCase()} by ${req.user.name}.`,
    data: {
      loanNumber: approval.loanNumber,
      customerName: approval.customerName,
      amount: approval.requestedData.amount || approval.requestedData.addedAmount || 0,
      employeeName: req.user.name,
      loanId: approval.targetId,
      loanType: approval.targetModel,
      approvalId: approval._id
    }
  });

  const { notifyApprovalCountChange } = require("./notificationController");
  await notifyApprovalCountChange();

  sendResponse(res, 200, "success", `Request ${status} successfully`, null, approval);
});

module.exports = {
  getPendingApprovals,
  processApproval,
};
