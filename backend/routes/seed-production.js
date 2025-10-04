const express = require('express');
const { dbHelpers } = require('../database-production');
const router = express.Router();

// Temporary seeding endpoint - REMOVE AFTER USE
router.post('/seed-database', async (req, res) => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await dbHelpers.run('DELETE FROM menu_items');
    await dbHelpers.run('DELETE FROM menu_sections');
    await dbHelpers.run('DELETE FROM menus');

    // Insert menus
    const menus = [
      {
        id: 'lunch',
        name: 'Lunch Menu',
        schedule: 'Monday-Saturday 12pm-4:45pm',
        pricing: '£22 per person'
      },
      {
        id: 'sunday-lunch',
        name: 'Sunday Lunch Menu',
        schedule: 'Sunday 12pm-5pm',
        pricing: '£25 per person'
      },
      {
        id: 'weekend-evening',
        name: 'Weekend Evening Menu',
        schedule: 'Friday-Sunday 5pm-9pm',
        pricing: '£30 per person'
      },
      {
        id: 'tea-time',
        name: 'Tea Time Menu',
        schedule: 'Daily 2pm-4pm',
        pricing: '£20 per person'
      }
    ];

    for (const menu of menus) {
      await dbHelpers.run(
        'INSERT INTO menus (id, name, schedule, pricing) VALUES ($1, $2, $3, $4)',
        [menu.id, menu.name, menu.schedule, menu.pricing]
      );
    }

    // Insert menu sections
    const sections = [
      { menu_id: 'lunch', section_key: 'starters', name: 'Starters' },
      { menu_id: 'lunch', section_key: 'mains', name: 'Main Courses' },
      { menu_id: 'lunch', section_key: 'desserts', name: 'Desserts' },
      { menu_id: 'sunday-lunch', section_key: 'starters', name: 'Starters' },
      { menu_id: 'sunday-lunch', section_key: 'mains', name: 'Main Courses' },
      { menu_id: 'sunday-lunch', section_key: 'desserts', name: 'Desserts' },
      { menu_id: 'weekend-evening', section_key: 'starters', name: 'Starters' },
      { menu_id: 'weekend-evening', section_key: 'mains', name: 'Main Courses' },
      { menu_id: 'weekend-evening', section_key: 'desserts', name: 'Desserts' },
      { menu_id: 'tea-time', section_key: 'starters', name: 'Light Bites' },
      { menu_id: 'tea-time', section_key: 'mains', name: 'Main Items' },
      { menu_id: 'tea-time', section_key: 'desserts', name: 'Sweet Treats' }
    ];

    for (const section of sections) {
      await dbHelpers.run(
        'INSERT INTO menu_sections (menu_id, section_key, name) VALUES ($1, $2, $3)',
        [section.menu_id, section.section_key, section.name]
      );
    }

    // Insert sample menu items
    const items = [
      // Lunch Menu Items
      { id: 'l-starter-1', menu_id: 'lunch', section_key: 'starters', name: 'Soup of the Day', description: 'Freshly made soup with bread', price: 6.50 },
      { id: 'l-starter-2', menu_id: 'lunch', section_key: 'starters', name: 'Garlic Bread', description: 'Toasted garlic bread', price: 4.00 },
      { id: 'l-main-1', menu_id: 'lunch', section_key: 'mains', name: 'Chicken Caesar Salad', description: 'Classic Caesar salad with grilled chicken', price: 14.00 },
      { id: 'l-main-2', menu_id: 'lunch', section_key: 'mains', name: 'Fish and Chips', description: 'Beer-battered cod with chips', price: 16.00 },
      { id: 'l-main-3', menu_id: 'lunch', section_key: 'mains', name: 'Beef Burger', description: '8oz burger with fries', price: 15.00 },
      { id: 'l-dessert-1', menu_id: 'lunch', section_key: 'desserts', name: 'Ice Cream', description: 'Vanilla ice cream', price: 4.50 },
      { id: 'l-dessert-2', menu_id: 'lunch', section_key: 'desserts', name: 'Chocolate Brownie', description: 'Warm chocolate brownie with ice cream', price: 6.00 },

      // Sunday Lunch Menu Items
      { id: 'sl-starter-1', menu_id: 'sunday-lunch', section_key: 'starters', name: 'Soup of the Day', description: 'Freshly made soup', price: 7.00 },
      { id: 'sl-starter-2', menu_id: 'sunday-lunch', section_key: 'starters', name: 'Prawn Cocktail', description: 'Classic prawn cocktail', price: 8.50 },
      { id: 'sl-main-1', menu_id: 'sunday-lunch', section_key: 'mains', name: 'Roast Beef', description: 'Served with seasonal vegetables', price: 18.00 },
      { id: 'sl-main-2', menu_id: 'sunday-lunch', section_key: 'mains', name: 'Roast Chicken', description: 'Served with seasonal vegetables', price: 16.00 },
      { id: 'sl-main-3', menu_id: 'sunday-lunch', section_key: 'mains', name: 'Vegetarian Wellington', description: 'Mushroom and nut wellington', price: 15.00 },
      { id: 'sl-dessert-1', menu_id: 'sunday-lunch', section_key: 'desserts', name: 'Apple Crumble', description: 'With custard', price: 6.50 },
      { id: 'sl-dessert-2', menu_id: 'sunday-lunch', section_key: 'desserts', name: 'Sticky Toffee Pudding', description: 'Classic dessert with custard', price: 7.00 },

      // Weekend Evening Menu Items
      { id: 'we-starter-1', menu_id: 'weekend-evening', section_key: 'starters', name: 'Prawn Cocktail', description: 'Classic prawn cocktail', price: 8.50 },
      { id: 'we-starter-2', menu_id: 'weekend-evening', section_key: 'starters', name: 'Bruschetta', description: 'Tomato and basil bruschetta', price: 7.50 },
      { id: 'we-main-1', menu_id: 'weekend-evening', section_key: 'mains', name: 'Fillet Steak', description: 'With peppercorn sauce', price: 28.00 },
      { id: 'we-main-2', menu_id: 'weekend-evening', section_key: 'mains', name: 'Salmon Fillet', description: 'Pan-fried with lemon butter', price: 22.00 },
      { id: 'we-main-3', menu_id: 'weekend-evening', section_key: 'mains', name: 'Lamb Rack', description: 'Herb-crusted lamb rack', price: 26.00 },
      { id: 'we-dessert-1', menu_id: 'weekend-evening', section_key: 'desserts', name: 'Chocolate Fudge Cake', description: 'Warm with ice cream', price: 7.00 },
      { id: 'we-dessert-2', menu_id: 'weekend-evening', section_key: 'desserts', name: 'Tiramisu', description: 'Classic Italian dessert', price: 7.50 },

      // Tea Time Menu Items
      { id: 'tt-starter-1', menu_id: 'tea-time', section_key: 'starters', name: 'Mini Quiche', description: 'Assorted mini quiches', price: 6.00 },
      { id: 'tt-starter-2', menu_id: 'tea-time', section_key: 'starters', name: 'Scones', description: 'Freshly baked scones', price: 5.50 },
      { id: 'tt-main-1', menu_id: 'tea-time', section_key: 'mains', name: 'Sandwich Platter', description: 'Selection of sandwiches', price: 12.00 },
      { id: 'tt-main-2', menu_id: 'tea-time', section_key: 'mains', name: 'Cake Selection', description: 'Assorted cakes and pastries', price: 8.00 },
      { id: 'tt-dessert-1', menu_id: 'tea-time', section_key: 'desserts', name: 'Scones with Cream', description: 'Freshly baked scones', price: 5.50 },
      { id: 'tt-dessert-2', menu_id: 'tea-time', section_key: 'desserts', name: 'Fruit Cake', description: 'Traditional fruit cake', price: 4.50 }
    ];

    for (const item of items) {
      await dbHelpers.run(
        'INSERT INTO menu_items (id, menu_id, section_key, name, description, price) VALUES ($1, $2, $3, $4, $5, $6)',
        [item.id, item.menu_id, item.section_key, item.name, item.description, item.price]
      );
    }

    // Create a default admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await dbHelpers.run(
      'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
      ['admin', hashedPassword]
    );

    console.log('✅ Database seeded successfully!');
    res.json({ 
      success: true, 
      message: 'Database seeded successfully!',
      menus: menus.length,
      sections: sections.length,
      items: items.length
    });

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    res.status(500).json({ success: false, message: 'Failed to seed database', error: error.message });
  }
});

module.exports = router;
