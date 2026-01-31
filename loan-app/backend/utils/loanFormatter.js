/**
 * Formats a raw Mongoose loan document into a structured, organized JSON response.
 * Groups related fields into logical objects.
 *
 * @param {Object} loanDoc - The Mongoose document or plain object
 * @returns {Object} Structured loan response
 */
const formatLoanResponse = (loanDoc) => {
  if (!loanDoc) return null;

  // Convert to plain object if it's a Mongoose document
  const loan = loanDoc.toObject ? loanDoc.toObject() : loanDoc;

  return {
    loanInfo: {
      id: loan._id,
      loanNumber: loan.loanNumber,
      status: loan.status,
      paymentStatus: loan.paymentStatus,
      isSeized: loan.isSeized || false,
      createdBy: loan.createdBy,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    },
    customer: {
      name: loan.customerName,
      address: loan.address,
      ownRent: loan.ownRent,
      contact: {
        mobileNumbers: loan.mobileNumbers || [],
        alternateMobile: loan.alternateMobile || "",
      },
      identifiers: {
        panNumber: loan.panNumber,
        aadharNumber: loan.aadharNumber,
      },
    },
    guarantor: {
      name: loan.guarantorName,
      contact: {
        mobileNumbers: loan.guarantorMobileNumbers || [],
      },
    },
    financials: {
      principalAmount: loan.principalAmount,
      annualInterestRate: loan.annualInterestRate,
      tenure: {
        months: loan.tenureMonths,
        type: loan.tenureType,
      },
      emi: {
        monthlyAmount: loan.monthlyEMI,
        totalInterest: loan.totalInterestAmount,
        startDate: loan.emiStartDate,
        endDate: loan.emiEndDate,
      },
      fees: {
        processingFeeRate: loan.processingFeeRate,
        processingFee: loan.processingFee,
      },
    },
    vehicleDetails: {
      registrationNumber: loan.vehicleNumber,
      model: loan.model,
      chassisNumber: loan.chassisNumber,
      engineNumber: loan.engineNumber,
      type: loan.typeOfVehicle,
      boardType: loan.ywBoard,
    },
    extras: {
      dealerInfo: {
        name: loan.dealerName,
        number: loan.dealerNumber,
      },
      dates: {
        disbursement: loan.dateLoanDisbursed,
        fcDate: loan.fcDate,
        insuranceDate: loan.insuranceDate,
      },
      rtoWorkPending: loan.rtoWorkPending || [],
      docChecklist: loan.docChecklist,
      remarks: loan.remarks,
    },
  };
};

module.exports = { formatLoanResponse };
