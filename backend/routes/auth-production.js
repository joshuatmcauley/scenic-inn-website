const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { dbHelpers } = require('../database-production');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Brute force protection - track failed login attempts
const loginAttempts = new Map(); // In production, use Redis or database
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Rate limiting for login endpoint (stricter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes per IP
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Password validation
function validatePassword(password) {
  if (!password || password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters long' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  if (!hasUpperCase) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumbers) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*...)' };
  }
  
  // Check for common passwords
  const commonPasswords = ['password', 'password123', 'admin', '12345678', 'qwerty', 'letmein'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    return { valid: false, message: 'Password is too common. Please choose a stronger password' };
  }
  
  return { valid: true };
}

// Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, ''); // Basic XSS prevention
}

// Login endpoint with brute force protection
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const attemptKey = `${clientIP}_${username}`;

    // Input validation and sanitization
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const sanitizedUsername = sanitizeInput(username);

    // Check for account lockout
    const attemptData = loginAttempts.get(attemptKey);
    if (attemptData && attemptData.lockedUntil > Date.now()) {
      const remainingTime = Math.ceil((attemptData.lockedUntil - Date.now()) / 1000 / 60);
      return res.status(429).json({
        success: false,
        message: `Account temporarily locked due to too many failed attempts. Try again in ${remainingTime} minute(s).`
      });
    }

    // Find admin user in database
    const admin = await dbHelpers.getAdminByUsername(sanitizedUsername);
    if (!admin) {
      // Log failed attempt
      const attempts = attemptData ? attemptData.count + 1 : 1;
      loginAttempts.set(attemptKey, {
        count: attempts,
        lockedUntil: attempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : null
      });
      
      // Log failed login attempt
      console.warn(`[SECURITY] Failed login attempt for username: ${sanitizedUsername} from IP: ${clientIP}`);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      // Log failed attempt
      const attempts = attemptData ? attemptData.count + 1 : 1;
      loginAttempts.set(attemptKey, {
        count: attempts,
        lockedUntil: attempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : null
      });
      
      // Log failed login attempt
      console.warn(`[SECURITY] Failed login attempt for user ID: ${admin.id} from IP: ${clientIP}`);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Successful login - clear failed attempts
    loginAttempts.delete(attemptKey);
    
    // Log successful login
    console.log(`[SECURITY] Successful login for user ID: ${admin.id}, username: ${admin.username} from IP: ${clientIP}, rememberMe: ${rememberMe || false}`);

    // Generate JWT token with expiration based on rememberMe
    // If rememberMe is true, token lasts 7 days, otherwise 8 hours
    const tokenExpiration = rememberMe ? '7d' : '8h';
    
    const token = jwt.sign(
      { 
        id: admin.id, 
        username: admin.username, 
        role: 'admin',
        rememberMe: rememberMe || false,
        iat: Math.floor(Date.now() / 1000)
      }, 
      JWT_SECRET, 
      { expiresIn: tokenExpiration }
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
    console.error('[SECURITY] Login error:', error);
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

// Create admin user endpoint - SECURED (only allow in development or with special token)
router.post('/create-admin', async (req, res) => {
  try {
    // SECURITY: Only allow in development or with special secret token
    const CREATE_ADMIN_SECRET = process.env.CREATE_ADMIN_SECRET;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!isDevelopment && !CREATE_ADMIN_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Admin creation is disabled in production'
      });
    }
    
    if (!isDevelopment && req.body.secret !== CREATE_ADMIN_SECRET) {
      return res.status(403).json({
        success: false,
        message: 'Invalid secret token'
      });
    }

    const { username, password, email } = req.body;

    // Input validation and sanitization
    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and email are required'
      });
    }

    const sanitizedUsername = sanitizeInput(username);
    const sanitizedEmail = sanitizeInput(email);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Check if admin already exists
    const existingAdmin = await dbHelpers.getAdminByUsername(sanitizedUsername);
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists'
      });
    }

    // Hash password with higher rounds for better security
    const hashedPassword = await bcrypt.hash(password, 12); // Increased from 10 to 12
    const newAdmin = await dbHelpers.createAdminUser(sanitizedUsername, hashedPassword, sanitizedEmail);

    console.log(`[SECURITY] New admin user created: ${sanitizedUsername} (ID: ${newAdmin.id})`);

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
    console.error('[SECURITY] Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
