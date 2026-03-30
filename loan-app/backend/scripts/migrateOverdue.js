const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const EMI = require("../models/EMI");
const dotenv = require("dotenv");

// Load env vars
dotenv.config();

const migrate = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/loan-app");
    console.log("Connected to MongoDB...");

    const models = [
      { name: "Loan", model: Loan },
      { name: "WeeklyLoan", model: WeeklyLoan },
      { name: "DailyLoan", model: DailyLoan }
    ];

    for (const { name, model } of models) {
      const records = await model.find({});
      console.log(`Migrating ${records.length} ${name} records...`);

      for (const record of records) {
        const emis = await EMI.find({ loanId: record._id });
        let totalOverdue = 0;

        emis.forEach(emi => {
          if (Array.isArray(emi.overdue)) {
            emi.overdue.forEach(ov => {
              totalOverdue += parseFloat(ov.amount) || 0;
            });
          } else if (typeof emi.overdue === 'number') {
            totalOverdue += emi.overdue;
          }
        });

        record.odAmount = totalOverdue;
        try {
          await record.save();
        } catch (saveErr) {
          console.error(`Error saving ${name} ${record.loanNumber}:`, saveErr.message);
          throw saveErr;
        }
      }
      console.log(`Finished migrating ${name}.`);
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed with error:", err);
    process.exit(1);
  }
};

migrate();
