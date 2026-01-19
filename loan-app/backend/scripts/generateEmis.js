const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const Loan = require("../models/Loan");
const EMI = require("../models/EMI");

const calculateEMI = (principal, roi, tenureMonths) => {
  const r = roi / 12 / 100;
  const n = tenureMonths;
  if (r === 0) return parseFloat((principal / n).toFixed(2));
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return parseFloat(emi.toFixed(2));
};

const run = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully.");

    const loans = await Loan.find();
    console.log(`Found ${loans.length} total loans.`);

    let generatedCount = 0;
    let skippedCount = 0;

    for (const loan of loans) {
      const existingEMIs = await EMI.find({ loanId: loan._id });

      if (existingEMIs.length > 0) {
        skippedCount++;
        continue;
      }

      console.log(
        `Generating EMIs for Loan: ${loan.loanNumber} (${loan.customerName})...`
      );

      const tenureMonths = loan.tenureMonths || 12;
      const principalAmount = loan.principalAmount;
      const annualInterestRate = loan.annualInterestRate;

      const monthlyEMI =
        loan.monthlyEMI ||
        calculateEMI(principalAmount, annualInterestRate, tenureMonths);

      const emis = [];
      let currentEmiDate = new Date(
        loan.emiStartDate || loan.loanStartDate || new Date()
      );

      for (let i = 1; i <= tenureMonths; i++) {
        emis.push({
          loanId: loan._id,
          loanNumber: loan.loanNumber,
          customerName: loan.customerName,
          emiNumber: i,
          dueDate: new Date(currentEmiDate),
          emiAmount: monthlyEMI,
          status: "Pending",
        });
        currentEmiDate.setMonth(currentEmiDate.getMonth() + 1);
      }

      await EMI.insertMany(emis);
      generatedCount++;
    }

    console.log("\nSummary:");
    console.log(`- Generated EMIs for: ${generatedCount} loans`);
    console.log(`- Skipped (already have EMIs): ${skippedCount} loans`);
    console.log("- Total loans processed:", loans.length);

    process.exit(0);
  } catch (error) {
    console.error("Error generating EMIs:", error);
    process.exit(1);
  }
};

run();
