const express = require('express');
const { dbHelpers } = require('../database-production');
const router = express.Router();

// Get all menus
router.get('/', async (req, res) => {
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

// Get menu by ID
router.get('/:menuId', async (req, res) => {
  try {
    const { menuId } = req.params;
    const menu = await dbHelpers.getMenuById(menuId);
    
    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    res.json({
      success: true,
      data: menu
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu'
    });
  }
});

// Get menu items for a specific menu
router.get('/:menuId/items', async (req, res) => {
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

// Test endpoint to get all menu items
router.get('/test/all-items', async (req, res) => {
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
