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

// Get menu item by ID (admin)
router.get('/menus/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await dbHelpers.getMenuItemById(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu item'
    });
  }
});

// Update menu item (admin)
router.put('/menus/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const updateData = req.body;

    // Validate required fields
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No update data provided'
      });
    }

    const updatedItem = await dbHelpers.updateMenuItem(itemId, updateData);

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu item: ' + error.message
    });
  }
});

// Update multiple menu items (admin)
router.put('/menus/items', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items provided for update'
      });
    }

    const results = [];
    const errors = [];

    for (const itemUpdate of items) {
      try {
        const { id, ...updateData } = itemUpdate;
        if (!id) {
          errors.push({ item: itemUpdate, error: 'Missing item ID' });
          continue;
        }

        const updatedItem = await dbHelpers.updateMenuItem(id, updateData);
        results.push(updatedItem);
      } catch (error) {
        errors.push({ item: itemUpdate, error: error.message });
      }
    }

    res.json({
      success: errors.length === 0,
      message: `Updated ${results.length} item(s)${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error updating menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu items: ' + error.message
    });
  }
});

module.exports = router;
