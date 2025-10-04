const express = require('express');
const router = express.Router();
const { dbHelpers } = require('../database');

// JWT authentication middleware
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

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
    
    // Add user info to request
    req.user = decoded;
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

// Get all menus (admin view)
router.get('/menus', async (req, res) => {
  try {
    const menus = await dbHelpers.getAllMenus();
    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('Get menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menus'
    });
  }
});

// Get specific menu (admin view)
router.get('/menus/:menuId', async (req, res) => {
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
    console.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu'
    });
  }
});

// Create new menu
router.post('/menus', async (req, res) => {
  try {
    const { name, schedule, pricing, sections } = req.body;
    
    if (!name || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Name and schedule are required'
      });
    }
    
    // Generate menu ID
    const menuId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const menuData = {
      id: menuId,
      name,
      schedule,
      pricing: pricing || null,
      sections: sections || {}
    };
    
    const newMenu = await dbHelpers.createMenu(menuData);
    
    res.status(201).json({
      success: true,
      message: 'Menu created successfully',
      data: newMenu
    });
    
  } catch (error) {
    console.error('Create menu error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({
        success: false,
        message: 'Menu with this name already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create menu'
      });
    }
  }
});

// Update menu
router.put('/menus/:menuId', async (req, res) => {
  try {
    const { menuId } = req.params;
    const { name, schedule, pricing, sections } = req.body;
    
    const existingMenu = await dbHelpers.getMenuById(menuId);
    if (!existingMenu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }
    
    const menuData = {
      name: name || existingMenu.name,
      schedule: schedule || existingMenu.schedule,
      pricing: pricing !== undefined ? pricing : existingMenu.pricing,
      sections: sections || existingMenu.sections
    };
    
    const updatedMenu = await dbHelpers.updateMenu(menuId, menuData);
    
    res.json({
      success: true,
      message: 'Menu updated successfully',
      data: updatedMenu
    });
    
  } catch (error) {
    console.error('Update menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu'
    });
  }
});

// Delete menu
router.delete('/menus/:menuId', async (req, res) => {
  try {
    const { menuId } = req.params;
    
    const result = await dbHelpers.deleteMenu(menuId);
    
    if (!result.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Menu deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu'
    });
  }
});

// Add item to menu section
router.post('/menus/:menuId/sections/:sectionKey/items', async (req, res) => {
  try {
    const { menuId, sectionKey } = req.params;
    const { name, description, price } = req.body;
    
    if (!name || !description || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, and price are required'
      });
    }
    
    const menu = await dbHelpers.getMenuById(menuId);
    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }
    
    // Generate item ID
    const itemId = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;
    
    const newItem = {
      id: itemId,
      name,
      description,
      price: parseFloat(price)
    };
    
    // Add item to the menu's sections
    if (!menu.sections[sectionKey]) {
      menu.sections[sectionKey] = {
        name: sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1).replace('-', ' '),
        items: []
      };
    }
    
    menu.sections[sectionKey].items.push(newItem);
    
    // Update the menu in database
    await dbHelpers.updateMenu(menuId, menu);
    
    res.status(201).json({
      success: true,
      message: 'Item added successfully',
      data: newItem
    });
    
  } catch (error) {
    console.error('Add item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item'
    });
  }
});

// Update menu item
router.put('/menus/:menuId/sections/:sectionKey/items/:itemId', async (req, res) => {
  try {
    const { menuId, sectionKey, itemId } = req.params;
    const { name, description, price } = req.body;
    
    const menu = await dbHelpers.getMenuById(menuId);
    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }
    
    if (!menu.sections[sectionKey]) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    const itemIndex = menu.sections[sectionKey].items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Update item
    if (name) menu.sections[sectionKey].items[itemIndex].name = name;
    if (description) menu.sections[sectionKey].items[itemIndex].description = description;
    if (price !== undefined) menu.sections[sectionKey].items[itemIndex].price = parseFloat(price);
    
    // Update the menu in database
    await dbHelpers.updateMenu(menuId, menu);
    
    res.json({
      success: true,
      message: 'Item updated successfully',
      data: menu.sections[sectionKey].items[itemIndex]
    });
    
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item'
    });
  }
});

// Delete menu item
router.delete('/menus/:menuId/sections/:sectionKey/items/:itemId', async (req, res) => {
  try {
    const { menuId, sectionKey, itemId } = req.params;
    
    const menu = await dbHelpers.getMenuById(menuId);
    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }
    
    if (!menu.sections[sectionKey]) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    const itemIndex = menu.sections[sectionKey].items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Remove item
    menu.sections[sectionKey].items.splice(itemIndex, 1);
    
    // Update the menu in database
    await dbHelpers.updateMenu(menuId, menu);
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item'
    });
  }
});

module.exports = router;