const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

async function login(req, res) {
  const { email, password } = req.body || {};

  if (
    typeof email !== 'string'
    || typeof password !== 'string'
    || !password
    || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    || Buffer.byteLength(password) > 72
  ) {
    return res.status(400).json({ error: 'Valid email and password are required' });
  }

  const admin = await Admin.findOne({ email: email.trim().toLowerCase() })
    .select('+passwordHash');

  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const expiresIn = '1h';
  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: admin._id.toString(),
    expiresIn,
  });

  return res.json({ token, tokenType: 'Bearer', expiresIn });
}

module.exports = { login };
