const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const login = asyncHandler(async (req, res, next) => {
  const { email, password, accessKey } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Please enter email & password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  if (user.role === "SUPER_ADMIN") {
    if (!accessKey || accessKey !== process.env.SUPER_ADMIN_ACCESS_KEY) {
      return next(new ErrorHandler("Invalid Super Admin access key", 403));
    }
  }

  if (!user.isActive) {
    return next(new ErrorHandler("Your account is deactivated", 403));
  }

  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "24h",
    }
  );

  return sendResponse(res, 200, "success", "Login successful", null, {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return next(new ErrorHandler("User not found", 404));

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordOTP = otp;
  user.resetPasswordOTPExpire = Date.now() + 15 * 60 * 1000;
  await user.save();

  console.log(`OTP for ${email}: ${otp}`); // Placeholder for actual email sending
  return sendResponse(res, 200, "success", "OTP sent to email", null, null);
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordOTPExpire: { $gt: Date.now() },
  });

  if (!user) return next(new ErrorHandler("Invalid or expired OTP", 400));

  user.password = newPassword;
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpire = undefined;
  await user.save();

  return sendResponse(
    res,
    200,
    "success",
    "Password reset successful",
    null,
    null
  );
});

module.exports = {
  login,
  forgotPassword,
  resetPassword,
};
