const formatLoanResponse = (loanDoc) => {
  if (!loanDoc) return null;

  const loan = loanDoc.toObject ? loanDoc.toObject() : loanDoc;

  return {
    _id: loan._id,
    id: loan._id,
    loanNumber: loan.loanNumber,
    customerName: loan.customerName,
    mobileNumbers: loan.mobileNumbers || [],
    vehicleNumber: loan.vehicleNumber,
    model: loan.model,
    isSeized: loan.isSeized || false,
    customerDetails: {
      customerName: loan.customerName,
      address: loan.address,
      ownRent: loan.ownRent,
      panNumber: loan.panNumber,
      aadharNumber: loan.aadharNumber,
      mobileNumbers: loan.mobileNumbers || [],
      address: loan.address,
      guarantorName: loan.guarantorName,
      guarantorMobileNumbers: loan.guarantorMobileNumbers || [],
    },
    loanTerms: {
      loanNumber: loan.loanNumber,
      principalAmount: loan.principalAmount,
      annualInterestRate: loan.annualInterestRate,
      tenureMonths: loan.tenureMonths,
      tenureType: loan.tenureType,
      dateLoanDisbursed: loan.dateLoanDisbursed,
      emiStartDate: loan.emiStartDate,
      emiEndDate: loan.emiEndDate,
      monthlyEMI: loan.monthlyEMI,
      totalInterestAmount: loan.totalInterestAmount,
      processingFee: loan.processingFee,
      processingFeeRate: loan.processingFeeRate,
    },
    vehicleInformation: {
      vehicleNumber: loan.vehicleNumber,
      chassisNumber: loan.chassisNumber,
      engineNumber: loan.engineNumber,
      model: loan.model,
      typeOfVehicle: loan.typeOfVehicle,
      ywBoard: loan.ywBoard,
      dealerName: loan.dealerName,
      dealerNumber: loan.dealerNumber,
      fcDate: loan.fcDate,
      insuranceDate: loan.insuranceDate,
      rtoWorkPending: loan.rtoWorkPending || [],
    },
    status: {
      status: loan.status,
      paymentStatus: loan.paymentStatus,
      isSeized: loan.isSeized || false,
      docChecklist: loan.docChecklist,
      remarks: loan.remarks,
      clientResponse: loan.clientResponse,
      nextFollowUpDate: loan.nextFollowUpDate,
      id: loan._id,
      createdBy: loan.createdBy,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    },
  };
};

module.exports = { formatLoanResponse };
