const express = require('express');
const router = express.Router();
const { dbHelpers } = require('../database');

// Get all menus (public API for visitors)
router.get('/', async (req, res) => {
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

// Get specific menu (public API for visitors)
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
    console.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu'
    });
  }
});

// Get menu by day/time (helper endpoint for frontend)
router.get('/available/:day/:time', async (req, res) => {
  try {
    const { day, time } = req.params;
    const allMenus = await dbHelpers.getAllMenus();
    
    // Filter menus based on day and time
    const availableMenus = allMenus.filter(menu => {
      const schedule = menu.schedule.toLowerCase();
      const dayLower = day.toLowerCase();
      const timeNum = parseInt(time.replace(':', ''));
      
      // Check if menu is available on this day
      const dayMatch = schedule.includes(dayLower) || 
                      (dayLower === 'monday' && schedule.includes('mon')) ||
                      (dayLower === 'tuesday' && schedule.includes('tue')) ||
                      (dayLower === 'wednesday' && schedule.includes('wed')) ||
                      (dayLower === 'thursday' && schedule.includes('thu')) ||
                      (dayLower === 'friday' && schedule.includes('fri')) ||
                      (dayLower === 'saturday' && schedule.includes('sat')) ||
                      (dayLower === 'sunday' && schedule.includes('sun'));
      
      // Check if menu is available at this time
      const timeMatch = schedule.includes(time) || 
                       (timeNum >= 1200 && timeNum <= 1645 && schedule.includes('12:00pm - 4:45pm')) ||
                       (timeNum >= 1700 && timeNum <= 2030 && schedule.includes('5:00pm - 8:30pm')) ||
                       (timeNum >= 1700 && timeNum <= 2100 && schedule.includes('5:00pm - 9:00pm')) ||
                       (timeNum >= 1200 && timeNum <= 1700 && schedule.includes('12:00pm - 5:00pm'));
      
      return dayMatch && timeMatch;
    });
    
    res.json({
      success: true,
      data: availableMenus
    });
  } catch (error) {
    console.error('Get available menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available menus'
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
        pricing: menu.pricing
      }
    });
  } catch (error) {
    console.error('Get menu pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu pricing'
    });
  }
});

// Get menu sections and items
router.get('/:menuId/sections', async (req, res) => {
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
        sections: menu.sections
      }
    });
  } catch (error) {
    console.error('Get menu sections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu sections'
    });
  }
});

module.exports = router;