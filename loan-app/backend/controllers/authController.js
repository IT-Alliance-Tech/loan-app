const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "24h" },
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d" },
  );

  return { accessToken, refreshToken };
};

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
  }

  const { accessToken, refreshToken } = generateTokens(user);

  // Save refresh token in DB and clear old grace period data
  user.refreshToken = refreshToken;
  user.previousRefreshToken = undefined;
  user.previousRefreshTokenExpiresAt = undefined;
  await user.save();

  // Set refresh token in secure cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
  });

  return sendResponse(res, 200, "success", "Login successful", null, {
    token: accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

const refreshToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return next(new ErrorHandler("Refresh token not found", 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    );
  } catch (err) {
    console.error("Refresh token verification failed:", err.message);
    return next(new ErrorHandler("Invalid refresh token", 403));
  }

  const user = await User.findById(decoded.id).select(
    "+refreshToken +previousRefreshToken +previousRefreshTokenExpiresAt",
  );

  if (!user) {
    return next(new ErrorHandler("User not found", 403));
  }

  let isGracePeriod = false;
  if (user.refreshToken !== token) {
    if (
      user.previousRefreshToken === token &&
      user.previousRefreshTokenExpiresAt &&
      user.previousRefreshTokenExpiresAt > Date.now()
    ) {
      isGracePeriod = true;
      console.log("Grace period refresh token used for user:", user.email);
    } else {
      console.warn(
        "Invalid refresh token attempt for user:",
        user.email,
        "| Token mismatch vs stored and no valid grace period found",
      );
      return next(new ErrorHandler("Invalid refresh token", 403));
    }
  }

  const tokens = generateTokens(user);

  if (!isGracePeriod) {
    user.previousRefreshToken = token;
    // 60 second grace period for concurrency
    user.previousRefreshTokenExpiresAt = new Date(Date.now() + 60000);
  }

  user.refreshToken = tokens.refreshToken;
  await user.save();

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 10 * 24 * 60 * 60 * 1000,
  });

  return sendResponse(res, 200, "success", "Token refreshed", null, {
    token: tokens.accessToken,
  });
});

const logout = asyncHandler(async (req, res, next) => {
  const token = req.cookies.refreshToken;

  if (token) {
    const user = await User.findOne({ refreshToken: token });
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  return sendResponse(
    res,
    200,
    "success",
    "Logged out successfully",
    null,
    null,
  );
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return next(new ErrorHandler("User not found", 404));

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordOTP = otp;
  user.resetPasswordOTPExpire = Date.now() + 15 * 60 * 1000;
  await user.save();

  console.log(`OTP for ${email}: ${otp}`);
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
    null,
  );
});

module.exports = {
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
};
