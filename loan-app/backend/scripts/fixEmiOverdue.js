const mongoose = require("mongoose");
const EMI = require("../models/EMI");
const dotenv = require("dotenv");

// Load env vars
dotenv.config();

const fixOverdue = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/loan-app");
    console.log("Connected to MongoDB...");

    // Find all EMIs where overdue is [0] or 0
    // Note: Since it's an array of subdocuments, we match the exact array [0] or the number 0
    const emisWithInconsistentOverdue = await EMI.find({
      $or: [
        { overdue: 0 },
        { overdue: [0] },
        { overdue: { $size: 1, $elemMatch: { $eq: 0 } } } // More robust check for [0] if it's treated as array of mixed
      ]
    });

    console.log(`Found ${emisWithInconsistentOverdue.length} EMIs with inconsistent overdue data.`);

    if (emisWithInconsistentOverdue.length > 0) {
      const result = await EMI.updateMany(
        {
          $or: [
            { overdue: 0 },
            { overdue: [0] }
          ]
        },
        { $set: { overdue: [] } }
      );
      console.log(`Successfully updated ${result.modifiedCount} EMIs.`);
    }

    console.log("Fix completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Fix failed with error:", err);
    process.exit(1);
  }
};

fixOverdue();
