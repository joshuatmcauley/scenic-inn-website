const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { initializeDatabase, dbHelpers } = require('./database-production');
require('dotenv').config();

// Deployment trigger - Dec 3, 2025

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required for Railway and other reverse proxies
app.set('trust proxy', true);

// Security middleware with enhanced configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for admin dashboard
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for admin dashboard
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(compression());

// Rate limiting
// Note: trust proxy is required for Railway to get correct client IPs
// We disable the validation warning since Railway's proxy is trusted
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  validate: false, // Disable validation (Railway requires trust proxy)
  keyGenerator: (req) => {
    // Use IP from Railway's proxy headers (trust proxy handles this)
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});
app.use('/api/', limiter);

// CORS configuration for production
app.use(cors({
  origin: [
    'https://scenic-inn.netlify.app',
    'https://*.netlify.app',
    'https://scenicinnbookings.com',
    'https://www.scenicinnbookings.com',
    'https://scenicinn-bookings.co.uk',
    'https://www.scenicinn-bookings.co.uk',
    'https://kipaxe.co.uk',  // Keep for transition period
    'https://www.kipaxe.co.uk',  // Keep for transition period
    'http://localhost:3000',
    'http://localhost:8080',
    'https://scenic-inn-website.vercel.app',
    'https://scenic-inn-website-git-master-joshua-mcauleys-projects.vercel.app',
    'https://scenic-inn-website-8cevkgxdc-joshua-mcauleys-projects.vercel.app',
    'https://*.vercel.app',
    'https://joshuatmcauley.github.io'
  ],
  credentials: true
}));

console.log('CORS configured for Vercel and GitHub Pages');
// Server ready for Railway deployment

// Logging
app.use(morgan('combined'));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware
app.use((req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim().replace(/[<>]/g, '');
      }
    });
  }
  
  // Sanitize body parameters (except for admin routes which handle their own)
  if (req.body && !req.path.startsWith('/api/admin') && !req.path.startsWith('/api/auth')) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim().replace(/[<>]/g, '');
      }
    });
  }
  
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'The Scenic Inn API Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth-production'));
app.use('/api/admin', require('./routes/admin-production'));
app.use('/api/menu', require('./routes/menu-production'));
app.use('/api/menus', require('./routes/menu-production'));
app.use('/api/booking', require('./routes/booking-production'));
// Booking submission (PDF + email) to match frontend `${API_BASE_URL}/booking-submission`
app.use('/api/booking-submission', require('./routes/booking-submission'));
app.use('/api/seed', require('./routes/seed-production')); // Temporary seeding endpoint

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 The Scenic Inn API server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔧 Admin API: http://localhost:${PORT}/api/admin`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
