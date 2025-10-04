const express = require('express');
const jwt = require('jsonwebtoken');
const { dbHelpers } = require('../database-production');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
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
    req.user = decoded; // Attach user info to request
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Apply authentication to all admin routes
router.use(authenticateAdmin);

// Get all menus (admin)
router.get('/menus', async (req, res) => {
  try {
    const menus = await dbHelpers.getAllMenus();
    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menus'
    });
  }
});

// Get menu items (admin)
router.get('/menus/:menuId/items', async (req, res) => {
  try {
    const { menuId } = req.params;
    const items = await dbHelpers.getMenuItems(menuId);
    
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu items'
    });
  }
});

// Get all menu items (admin)
router.get('/menus/test/all-items', async (req, res) => {
  try {
    const items = await dbHelpers.getAllMenuItems();
    res.json({
      success: true,
      count: items.length,
      items: items
    });
  } catch (error) {
    console.error('Error fetching all menu items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch all menu items'
    });
  }
});

module.exports = router;
