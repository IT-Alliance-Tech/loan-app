const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env
dotenv.config({ path: path.join(__dirname, "backend", ".env") });

const Loan = require("./backend/models/Loan");
const WeeklyLoan = require("./backend/models/WeeklyLoan");
const DailyLoan = require("./backend/models/DailyLoan");
const EMI = require("./backend/models/EMI");
const User = require("./backend/models/User");

const MONGO_URI = process.env.MONGODB_URI;

async function verify() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // 1. Create a test user
    let user = await User.findOne({ email: "admin@loanapp.com" });
    if (!user) {
      user = await User.create({
        name: "Admin",
        email: "admin@loanapp.com",
        password: "password123",
        role: "admin",
      });
    }

    const { updateEMI } = require("./backend/controllers/customercontroller");

    // Mock req, res, next
    const mockRes = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.data = data;
        return this;
      },
    };
    const mockNext = (err) => {
      console.error("Next called with error:", err);
      throw err;
    };

    // --- TEST 1: Main Loan Sync ---
    console.log("\n--- Testing Main Loan Sync ---");
    const mainLoan = await Loan.create({
      loanNumber: "TEST-MAIN-" + Date.now(),
      customerName: "Test Main",
      address: "Test Address",
      mobileNumbers: ["1234567890"],
      guarantorMobileNumbers: ["0987654321"],
      principalAmount: 10000,
      tenureMonths: 1,
      annualInterestRate: 12,
      status: "Active",
      paymentStatus: "Pending",
      createdBy: user._id,
    });

    const mainEmi = await EMI.create({
      loanId: mainLoan._id,
      loanModel: "Loan",
      loanNumber: mainLoan.loanNumber,
      customerName: mainLoan.customerName,
      emiNumber: 1,
      dueDate: new Date(),
      emiAmount: 11000,
      status: "Pending",
    });

    // Update with dateGroups
    console.log("Updating with dateGroups...");
    await updateEMI(
      {
        params: { id: mainEmi._id },
        body: {
          dateGroups: [
            {
              date: new Date().toISOString().split("T")[0],
              payments: [{ mode: "CASH", amount: 11000 }],
            },
          ],
        },
        user: user,
      },
      mockRes,
      mockNext,
    );

    const updatedMainLoan = await Loan.findById(mainLoan._id);
    console.log(
      "Main Loan Payment Status after update:",
      updatedMainLoan.paymentStatus,
    );

    if (updatedMainLoan.paymentStatus === "Paid") {
      console.log("✅ Main Loan Sync SUCCESS");
    } else {
      console.log("❌ Main Loan Sync FAILED");
    }

    // --- TEST 2: Robustness with addedAmount ---
    console.log("\n--- Testing Robustness with addedAmount (Legacy) ---");
    const legacyEmi = await EMI.create({
      loanId: mainLoan._id,
      loanModel: "Loan",
      loanNumber: mainLoan.loanNumber,
      customerName: mainLoan.customerName,
      emiNumber: 2,
      dueDate: new Date(),
      emiAmount: 5000,
      status: "Pending",
    });

    await updateEMI(
      {
        params: { id: legacyEmi._id },
        body: {
          addedAmount: 5000,
          paymentMode: "GPAY",
          paymentDate: new Date().toISOString().split("T")[0],
        },
        user: user,
      },
      mockRes,
      mockNext,
    );

    const updatedLegacyEmi = await EMI.findById(legacyEmi._id);
    console.log("Legacy EMI status:", updatedLegacyEmi.status);
    console.log(
      "Legacy EMI history count:",
      updatedLegacyEmi.paymentHistory.length,
    );
    console.log("Legacy EMI mode:", updatedLegacyEmi.paymentMode);

    if (
      updatedLegacyEmi.status === "Paid" &&
      updatedLegacyEmi.paymentHistory.length === 1 &&
      updatedLegacyEmi.paymentMode === "GPAY"
    ) {
      console.log("✅ Robustness Fallback SUCCESS");
    } else {
      console.log("❌ Robustness Fallback FAILED");
    }

    // --- CLEANUP ---
    await Loan.deleteOne({ _id: mainLoan._id });
    await EMI.deleteMany({ loanId: mainLoan._id });
    console.log("\nCleanup complete");

    process.exit(0);
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

verify();
