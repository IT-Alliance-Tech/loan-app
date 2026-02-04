/**
 * Flattens a structured loan object back into a flat format expected by LoanForm and other components.
 *
 * @param {Object} structuredLoan - The structured loan object from the API
 * @returns {Object} Flat loan object
 */
export const flattenLoan = (structuredLoan) => {
  if (!structuredLoan) return null;

  // If it's already flat (e.g., from an old API or local state), return it as is
  if (!structuredLoan.loanInfo) return structuredLoan;

  const {
    loanInfo = {},
    customer = {},
    guarantor = {},
    financials = {},
    vehicleDetails = {},
    extras = {},
  } = structuredLoan;

  return {
    _id: loanInfo.id,
    loanNumber: loanInfo.loanNumber,
    status: loanInfo.status,
    paymentStatus: loanInfo.paymentStatus,
    isSeized: loanInfo.isSeized,
    createdBy: loanInfo.createdBy,
    createdAt: loanInfo.createdAt,
    updatedAt: loanInfo.updatedAt,

    customerName: customer.name,
    address: customer.address,
    ownRent: customer.ownRent,
    mobileNumbers: customer.contact?.mobileNumbers || [],
    alternateMobile: customer.contact?.alternateMobile || "",
    panNumber: customer.identifiers?.panNumber || "",
    aadharNumber: customer.identifiers?.aadharNumber || "",

    guarantorName: guarantor.name,
    guarantorMobileNumbers: guarantor.contact?.mobileNumbers || [],

    principalAmount: financials.principalAmount,
    annualInterestRate: financials.annualInterestRate,
    tenureMonths: financials.tenure?.months,
    tenureType: financials.tenure?.type,
    monthlyEMI: financials.emi?.monthlyAmount,
    totalInterestAmount: financials.emi?.totalInterest,
    emiStartDate: financials.emi?.startDate,
    emiEndDate: financials.emi?.endDate,
    processingFeeRate: financials.fees?.processingFeeRate,
    processingFee: financials.fees?.processingFee,

    vehicleNumber: vehicleDetails.registrationNumber,
    model: vehicleDetails.model,
    chassisNumber: vehicleDetails.chassisNumber,
    engineNumber: vehicleDetails.engineNumber,
    typeOfVehicle: vehicleDetails.type,
    ywBoard: vehicleDetails.boardType,

    dealerName: extras.dealerInfo?.name || "",
    dealerNumber: extras.dealerInfo?.number || "",
    dateLoanDisbursed: extras.dates?.disbursement,
    fcDate: extras.dates?.fcDate,
    insuranceDate: extras.dates?.insuranceDate,
    rtoWorkPending: extras.rtoWorkPending || [],
    docChecklist: extras.docChecklist || "",
    remarks: extras.remarks || "",
  };
};
