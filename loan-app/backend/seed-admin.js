const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load .env
dotenv.config({ path: path.join(__dirname, ".env") });

const User = require("./models/User");

const seedAdmin = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error("MONGODB_URI not found in .env");
        }

        console.log("Connecting to MongoDB with URI:", uri.substring(0, 20) + "...");
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });
        console.log("Connected successfully.");

        const email = "squarefinance2025@gmail.com";
        const password = "12345678";
        const accessKey = "admin123";

        let user = await User.findOne({ email });

        if (user) {
            console.log("Updating existing user...");
            user.password = password;
            user.role = "SUPER_ADMIN";
            user.accessKey = accessKey;
            user.isActive = true;
            user.permissions = {
                loans: { view: true, create: true, edit: true, delete: true },
                weeklyLoans: { view: true, create: true, edit: true, delete: true },
                dailyLoans: { view: true, create: true, edit: true, delete: true },
                emis: { view: true, create: true, edit: true, delete: true },
                vehicles: { view: true, create: true, edit: true, delete: true },
                payments: { view: true, create: true, edit: true, delete: true },
                documents: { view: true, create: true, edit: true, delete: true },
                analytics: { view: true, create: true, edit: true, delete: true },
                dashboard: { view: true, create: true, edit: true, delete: true },
                expenses: { view: true, create: true, edit: true, delete: true },
            };
            await user.save();
            console.log("User updated successfully.");
        } else {
            console.log("Creating new user...");
            await User.create({
                name: "Square Finance Admin",
                email,
                password,
                role: "SUPER_ADMIN",
                accessKey,
                isActive: true,
                permissions: {
                    loans: { view: true, create: true, edit: true, delete: true },
                    weeklyLoans: { view: true, create: true, edit: true, delete: true },
                    dailyLoans: { view: true, create: true, edit: true, delete: true },
                    emis: { view: true, create: true, edit: true, delete: true },
                    vehicles: { view: true, create: true, edit: true, delete: true },
                    payments: { view: true, create: true, edit: true, delete: true },
                    documents: { view: true, create: true, edit: true, delete: true },
                    analytics: { view: true, create: true, edit: true, delete: true },
                    dashboard: { view: true, create: true, edit: true, delete: true },
                    expenses: { view: true, create: true, edit: true, delete: true },
                },
            });
            console.log("User created successfully.");
        }
        process.exit(0);
    } catch (error) {
        console.error("SEEDING_ERROR:", error.message);
        process.exit(1);
    }
};

seedAdmin();
