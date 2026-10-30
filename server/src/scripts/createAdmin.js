require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const connectDB = require('../config/db');

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set a valid ADMIN_EMAIL in the environment');
  }

  const passwordBytes = password ? Buffer.byteLength(password) : 0;
  if (passwordBytes < 12 || passwordBytes > 72) {
    throw new Error('ADMIN_PASSWORD must be between 12 and 72 bytes');
  }

  await connectDB();

  const passwordHash = await bcrypt.hash(password, 12);
  await Admin.create({ email, passwordHash });
  console.log(`Admin created for ${email}`);
}

createAdmin()
  .catch((error) => {
    console.error('Admin setup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
