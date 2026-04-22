const mongoose = require("mongoose");
require("dotenv").config();
const InterestLoan = require("./models/InterestLoan");

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    const count = await InterestLoan.countDocuments({});
    console.log(`Total Interest Loans: ${count}`);
    const loans = await InterestLoan.find({}).limit(5);
    console.log("First 5 loans:", JSON.stringify(loans, null, 2));
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
