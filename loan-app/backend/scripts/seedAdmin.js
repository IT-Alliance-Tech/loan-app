const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: './.env' });

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const adminExists = await User.findOne({ role: 'SUPER_ADMIN' });
    if (adminExists) {
      console.log('Super Admin already exists');
      process.exit();
    }

    await User.create({
      name: 'Super Admin',
      email: 'admin@ilrms.com',
      password: 'adminpassword123',
      role: 'SUPER_ADMIN',
    });

    console.log('Super Admin seeded successfully');
    process.exit();
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
