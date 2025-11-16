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

// Get menu(s) by date/time using schedule rules from database
// Returns array of all available menus (for selection if multiple)
// IMPORTANT: This route must come BEFORE /:menuId routes to avoid route conflicts
router.get('/for-datetime/:date/:time', async (req, res) => {
  try {
    const { date, time } = req.params;
    const menus = await dbHelpers.getMenusForDateTime(date, time);
    
    if (!menus || menus.length === 0) {
      return res.json({
        success: false,
        message: 'No menu available for this date and time',
        data: []
      });
    }
    
    res.json({
      success: true,
      data: menus.length === 1 ? menus[0] : menus, // Return single object if one menu, array if multiple
      multiple: menus.length > 1
    });
  } catch (error) {
    console.error('Get menu for date/time error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to determine menu: ' + error.message
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
    const { forPreorder } = req.query;
    
    // Use filtered items for preorder, all items for admin/display
    const items = forPreorder === 'true' 
      ? await dbHelpers.getMenuItemsForPreorder(menuId)
      : await dbHelpers.getMenuItems(menuId);
    
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

// Get menu pricing information
router.get('/:menuId/pricing', async (req, res) => {
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
      data: {
        id: menu.id,
        name: menu.name,
        pricing_type: menu.pricing_type,
        pricing: menu.pricing ? JSON.parse(menu.pricing) : null
      }
    });
  } catch (error) {
    console.error('Error fetching menu pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu pricing'
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
