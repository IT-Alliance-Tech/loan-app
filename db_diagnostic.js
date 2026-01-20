const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: "./backend/.env" });

const checkDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/loan-app";
    console.log(`Connecting to: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log("Connected successfully");

    const db = mongoose.connection.db;
    const allUsers = await db.collection("users").find({}).toArray();

    console.log(`Total Users found: ${allUsers.length}`);
    allUsers.forEach((u, i) => {
      console.log(
        `${i + 1}. Name: "${u.name}", Email: "${u.email}", Role: "${u.role}", Active: ${u.isActive}`,
      );
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Diagnostic error:", err);
    process.exit(1);
  }
};

checkDB();
