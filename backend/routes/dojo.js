const express = require('express');
const router = express.Router();
const dojoAPI = require('../config/dojo');
const { validateBookingData, validatePreorderData } = require('../middleware/validation');

// Test API connection
router.get('/test', async (req, res) => {
  try {
    // Test basic API connection
    const result = await dojoAPI.testConnection();
    res.json({ 
      status: 'connected', 
      message: 'Dojo API connection successful',
      result: result
    });
  } catch (error) {
    console.error('Dojo API connection test failed:', error);
    res.status(500).json({ 
      error: 'Dojo API connection failed', 
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Get available booking slots
router.get('/availability', async (req, res) => {
  try {
    const { date, party_size } = req.query;
    
    if (!date || !party_size) {
      return res.status(400).json({
        error: 'Date and party_size are required'
      });
    }

    const slots = await dojoAPI.getAvailableSlots(date, party_size);
    res.json(slots);
  } catch (error) {
    console.error('Error in availability endpoint:', error);
    res.status(500).json({
      error: 'Failed to fetch availability',
      message: error.message
    });
  }
});

// Get available experiences
router.get('/experiences', async (req, res) => {
  try {
    const experiences = await dojoAPI.getExperiences();
    res.json(experiences);
  } catch (error) {
    console.error('Error fetching experiences:', error);
    res.status(500).json({
      error: 'Failed to fetch experiences',
      message: error.message
    });
  }
});

// Get menu items for an experience
router.get('/experiences/:experienceId/menu', async (req, res) => {
  try {
    const { experienceId } = req.params;
    const menuItems = await dojoAPI.getMenuItems(experienceId);
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      error: 'Failed to fetch menu items',
      message: error.message
    });
  }
});

// Get all products from Dojo
router.get('/products', async (req, res) => {
  try {
    const products = await dojoAPI.getAllProducts();
    res.json({
      success: true,
      message: 'Products fetched successfully',
      data: products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    });
  }
});

// Get all menu items (for testing)
router.get('/menu-items', async (req, res) => {
  try {
    const experiences = await dojoAPI.getExperiences();
    const allMenuItems = {};
    
    // Get menu items for each experience
    for (const experience of experiences.experiences || []) {
      try {
        const menuItems = await dojoAPI.getMenuItems(experience.id);
        allMenuItems[experience.id] = menuItems;
      } catch (error) {
        console.error(`Error fetching menu for ${experience.id}:`, error);
        allMenuItems[experience.id] = { error: 'Failed to fetch menu items' };
      }
    }
    
    res.json({
      experiences: experiences,
      menuItems: allMenuItems
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      error: 'Failed to fetch menu items',
      message: error.message
    });
  }
});

// Sync menu data to main app
router.get('/sync-menus', async (req, res) => {
  try {
    const experiences = await dojoAPI.getExperiences();
    const menuData = {};
    
    // Get menu items for each experience
    for (const experience of experiences.experiences || []) {
      try {
        const menuItems = await dojoAPI.getMenuItems(experience.id);
        menuData[experience.id] = {
          name: experience.name,
          price: experience.price,
          items: menuItems
        };
      } catch (error) {
        console.error(`Error fetching menu for ${experience.id}:`, error);
        menuData[experience.id] = { 
          name: experience.name,
          price: experience.price,
          error: 'Failed to fetch menu items' 
        };
      }
    }
    
    res.json({
      success: true,
      message: 'Menu data synced successfully',
      data: menuData,
      source: experiences.source || 'dojo'
    });
  } catch (error) {
    console.error('Error syncing menu data:', error);
    res.status(500).json({
      error: 'Failed to sync menu data',
      message: error.message
    });
  }
});

// Create a booking with optional preorder
router.post('/bookings', validateBookingData, async (req, res) => {
  try {
    const bookingData = req.body;
    
    // If party size is 11+ and preorder is enabled but no preorder data, reject
    if (bookingData.party_size >= 11 && bookingData.preorder_enabled && (!bookingData.preorder || !bookingData.preorder.length)) {
      return res.status(400).json({
        error: 'Preorder required for parties of 11 or more',
        message: 'Large parties with preorder enabled must select their meals'
      });
    }

    // Validate preorder data if present
    if (bookingData.preorder && bookingData.preorder.length > 0) {
      const validationResult = validatePreorderData(bookingData.preorder, bookingData.party_size);
      if (!validationResult.valid) {
        return res.status(400).json({
          error: 'Invalid preorder data',
          message: validationResult.message
        });
      }
    }

    // Create the booking in Dojo
    const dojoBooking = await dojoAPI.createBooking(bookingData);
    
    // Store preorder data in our database if present
    if (bookingData.preorder && bookingData.preorder.length > 0) {
      // TODO: Store preorder data in your database
      console.log('Preorder data to store:', bookingData.preorder);
    }

    res.status(201).json({
      success: true,
      booking: dojoBooking,
      message: 'Booking created successfully'
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      error: 'Failed to create booking',
      message: error.message
    });
  }
});

// Get booking details
router.get('/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await dojoAPI.getBooking(bookingId);
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      error: 'Failed to fetch booking',
      message: error.message
    });
  }
});

// Update booking
router.put('/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updateData = req.body;
    
    const updatedBooking = await dojoAPI.updateBooking(bookingId, updateData);
    res.json(updatedBooking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      error: 'Failed to update booking',
      message: error.message
    });
  }
});

// Cancel booking
router.delete('/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    
    const result = await dojoAPI.cancelBooking(bookingId, reason);
    res.json(result);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      error: 'Failed to cancel booking',
      message: error.message
    });
  }
});

module.exports = router;
