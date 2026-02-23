const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Admin credentials (seeded as per requirements)
const ADMIN_CREDENTIALS = {
  email: 'admin@lekevogue.shop',
  password: 'Admin@12345' // This will be hashed
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id, email: ADMIN_CREDENTIALS.email }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @route   POST /api/auth/login
// @desc    Authenticate admin & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if email matches
    if (email !== ADMIN_CREDENTIALS.email) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches (compare with plain text as per seeded credentials)
    if (password !== ADMIN_CREDENTIALS.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(ADMIN_CREDENTIALS.email);

    res.json({
      success: true,
      token,
      admin: {
        email: ADMIN_CREDENTIALS.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/verify
// @desc    Verify token is valid
// @access  Protected
router.get('/verify', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    admin: req.admin
  });
});

// @route   POST /api/auth/seed
// @desc    Seed admin credentials (run once to hash and store)
// @access  Public (for initial setup only)
router.post('/seed', async (req, res) => {
  try {
    // Hash the password for future use
    const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, 10);
    
    res.json({
      success: true,
      message: 'Admin credentials configured',
      credentials: {
        email: ADMIN_CREDENTIALS.email,
        // Return plain password as per requirements for seeded login
        password: ADMIN_CREDENTIALS.password
      },
      hashedVersion: hashedPassword
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during seed'
    });
  }
});

module.exports = router;
