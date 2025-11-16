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

// Get menu sections (admin)
router.get('/menus/:menuId/sections', async (req, res) => {
  try {
    const { menuId } = req.params;
    const sections = await dbHelpers.getMenuSections(menuId);
    
    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    console.error('Error fetching menu sections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu sections'
    });
  }
});

// Create menu item (admin)
router.post('/menus/items', async (req, res) => {
  try {
    const itemData = req.body;

    // Validate required fields
    if (!itemData.menu_id || !itemData.section_key || !itemData.name || itemData.price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: menu_id, section_key, name, and price are required'
      });
    }

    const newItem = await dbHelpers.createMenuItem(itemData);

    res.json({
      success: true,
      message: 'Menu item created successfully',
      data: newItem
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create menu item: ' + error.message
    });
  }
});

// Delete menu item (admin)
router.delete('/menus/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const deletedItem = await dbHelpers.deleteMenuItem(itemId);

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      message: 'Menu item deleted successfully',
      data: deletedItem
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu item: ' + error.message
    });
  }
});

// Delete multiple menu items (admin)
router.delete('/menus/items', async (req, res) => {
  try {
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No item IDs provided for deletion'
      });
    }

    const deletedItems = await dbHelpers.deleteMenuItems(itemIds);

    res.json({
      success: true,
      message: `Successfully deleted ${deletedItems.length} item(s)`,
      data: deletedItems
    });
  } catch (error) {
    console.error('Error deleting menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu items: ' + error.message
    });
  }
});

// Create special (admin) - specials are dishes/items
router.post('/specials', async (req, res) => {
  try {
    const { name, description, price, menu_ids } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Dish name is required'
      });
    }

    if (!menu_ids || !Array.isArray(menu_ids) || menu_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one menu must be selected'
      });
    }

    const specialData = {
      name: name.trim(),
      description: description ? description.trim() : null,
      price: price ? parseFloat(price) : null,
      menu_ids: menu_ids
    };

    const newSpecial = await dbHelpers.createSpecial(specialData);

    res.json({
      success: true,
      message: 'Special created successfully',
      data: newSpecial
    });
  } catch (error) {
    console.error('Error creating special:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create special: ' + error.message
    });
  }
});

// Get all specials (admin)
router.get('/specials', async (req, res) => {
  try {
    const specials = await dbHelpers.getAllSpecials();

    res.json({
      success: true,
      data: specials
    });
  } catch (error) {
    console.error('Error fetching specials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch specials: ' + error.message
    });
  }
});

// Get menu schedule rules (admin) - returns all rules (active and inactive)
router.get('/menu-schedule-rules', async (req, res) => {
  try {
    const rules = await dbHelpers.getAllMenuScheduleRules();

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Error fetching menu schedule rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu schedule rules: ' + error.message
    });
  }
});

// Create or update menu schedule rule (admin)
router.post('/menu-schedule-rules', async (req, res) => {
  try {
    const ruleData = req.body;

    // Validate required fields
    if (!ruleData.menu_id || !ruleData.days_of_week || !ruleData.start_time || !ruleData.end_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: menu_id, days_of_week, start_time, and end_time are required'
      });
    }

    const rule = await dbHelpers.upsertMenuScheduleRule(ruleData);

    res.json({
      success: true,
      message: ruleData.id ? 'Schedule rule updated successfully' : 'Schedule rule created successfully',
      data: rule
    });
  } catch (error) {
    console.error('Error saving menu schedule rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save menu schedule rule: ' + error.message
    });
  }
});

// Delete menu schedule rule (admin)
router.delete('/menu-schedule-rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const deletedRule = await dbHelpers.deleteMenuScheduleRule(ruleId);

    if (!deletedRule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule rule not found'
      });
    }

    res.json({
      success: true,
      message: 'Schedule rule deleted successfully',
      data: deletedRule
    });
  } catch (error) {
    console.error('Error deleting menu schedule rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu schedule rule: ' + error.message
    });
  }
});

module.exports = router;
