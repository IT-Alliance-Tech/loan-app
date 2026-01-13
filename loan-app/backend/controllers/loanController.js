const Loan = require('../models/Loan');
const ErrorHandler = require('../utils/ErrorHandler');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/response');

const calculateEMI = (principal, roi, tenureMonths) => {
  const r = roi / 12 / 100;
  const n = tenureMonths;
  if (r === 0) return parseFloat((principal / n).toFixed(2));
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return parseFloat(emi.toFixed(2));
};

const createLoan = asyncHandler(async (req, res, next) => {
  const { loanNumber, customerName, mobileNumber, address, principal, roi, tenureMonths } = req.body;

  if (!loanNumber || !customerName || !mobileNumber || !principal || !roi || !tenureMonths) {
    return next(new ErrorHandler('Please provide all required fields', 400));
  }

  const existingLoan = await Loan.findOne({ loanNumber });
  if (existingLoan) {
    return next(new ErrorHandler('Loan number already exists', 400));
  }

  const monthlyEmi = calculateEMI(principal, roi, tenureMonths);

  const loan = await Loan.create({
    loanNumber,
    customerName,
    mobileNumber,
    address,
    principal,
    roi,
    tenureMonths,
    monthlyEmi,
    createdBy: req.user._id
  });

  sendResponse(res, 201, 'success', 'Loan created successfully', null, loan);
});

const getAllLoans = asyncHandler(async (req, res, next) => {
  const loans = await Loan.find().sort({ createdAt: -1 });
  sendResponse(res, 200, 'success', 'Loans fetched successfully', null, loans);
});

const getLoanByLoanNumber = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findOne({ loanNumber: req.params.loanNumber });
  if (!loan) {
    return next(new ErrorHandler('Loan not found', 404));
  }
  sendResponse(res, 200, 'success', 'Loan found', null, loan);
});

const updateLoan = asyncHandler(async (req, res, next) => {
  const { customerName, mobileNumber, address, principal, roi, tenureMonths } = req.body;
  
  let loan = await Loan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler('Loan not found', 404));
  }

  const updatedPrincipal = principal !== undefined ? principal : loan.principal;
  const updatedRoi = roi !== undefined ? roi : loan.roi;
  const updatedTenure = tenureMonths !== undefined ? tenureMonths : loan.tenureMonths;

  const monthlyEmi = calculateEMI(updatedPrincipal, updatedRoi, updatedTenure);

  loan = await Loan.findByIdAndUpdate(req.params.id, {
    customerName,
    mobileNumber,
    address,
    principal: updatedPrincipal,
    roi: updatedRoi,
    tenureMonths: updatedTenure,
    monthlyEmi
  }, { new: true, runValidators: true });

  sendResponse(res, 200, 'success', 'Loan updated successfully', null, loan);
});

const toggleSeizedStatus = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler('Loan not found', 404));
  }

  loan.isSeized = !loan.isSeized;
  await loan.save();

  sendResponse(res, 200, 'success', `Loan ${loan.isSeized ? 'seized' : 'unseized'} successfully`, null, loan);
});

module.exports = {
  createLoan,
  getAllLoans,
  getLoanByLoanNumber,
  updateLoan,
  toggleSeizedStatus
};
