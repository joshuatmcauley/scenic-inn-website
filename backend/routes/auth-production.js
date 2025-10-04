const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbHelpers } = require('../database-production');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find admin user in database
    const admin = await dbHelpers.getAdminByUsername(username);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin.id, 
        username: admin.username, 
        role: 'admin' 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: admin.id,
        username: admin.username,
        role: 'admin',
        email: admin.email || 'admin@thescenicinn.com'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user in database
    const admin = await dbHelpers.getAdminById(decoded.id);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
        role: 'admin',
        email: admin.email || 'admin@thescenicinn.com'
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Create admin user endpoint
router.post('/create-admin', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Input validation
    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and email are required'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters long'
      });
    }

    // Check if admin already exists
    const existingAdmin = await dbHelpers.getAdminByUsername(username);
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists'
      });
    }

    // Hash password and create new admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await dbHelpers.createAdminUser(username, hashedPassword, email);

    res.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: newAdmin.id,
        username: newAdmin.username,
        role: 'admin',
        email: newAdmin.email
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
