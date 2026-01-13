const User = require('../models/User');
const ErrorHandler = require('../utils/ErrorHandler');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/response');

const createEmployee = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  const user = await User.create({
    name,
    email,
    password,
    role: 'EMPLOYEE',
  });

  return sendResponse(res, 201, 'success', 'Employee created successfully', null, {
    id: user._id,
    name: user.name,
    email: user.email,
  });
});

const getEmployees = asyncHandler(async (req, res, next) => {
  const employees = await User.find({ role: 'EMPLOYEE' });

  return sendResponse(res, 200, 'success', 'Employees fetched successfully', null, employees);
});

const toggleEmployeeStatus = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user || user.role !== 'EMPLOYEE') {
    return next(new ErrorHandler('Employee not found', 404));
  }

  user.isActive = !user.isActive;
  await user.save();

  return sendResponse(res, 200, 'success', `Employee ${user.isActive ? 'activated' : 'deactivated'}`, null, user);
});

module.exports = {
  createEmployee,
  getEmployees,
  toggleEmployeeStatus,
};
