const express = require('express');
const { dbHelpers, pool } = require('../database-production');
const router = express.Router();

// Clear fake data and prepare for real data migration
router.post('/clear-fake-data', async (req, res) => {
  try {
    console.log('🧹 Clearing FAKE sample data from Railway...');
    
    await pool.query('DELETE FROM menu_items');
    await pool.query('DELETE FROM menu_sections');
    await pool.query('DELETE FROM menus');
    await pool.query('DELETE FROM admin_users');
    
    console.log('✅ All fake data cleared!');
    res.json({ 
      success: true, 
      message: 'All fake sample data cleared from Railway database. Ready for real data migration.'
    });

  } catch (error) {
    console.error('❌ Error clearing fake data:', error);
    res.status(500).json({ success: false, message: 'Failed to clear fake data', error: error.message });
  }
});

// Migration endpoint - will be called from local script
router.post('/migrate-real-data', async (req, res) => {
  try {
    const { menus, sections, items, admins } = req.body;
    
    console.log('🚀 Starting REAL data migration...');
    console.log(`📊 Migrating: ${menus.length} menus, ${sections.length} sections, ${items.length} items, ${admins.length} admins`);

    // Insert REAL menus
    for (const menu of menus) {
      await pool.query(
        'INSERT INTO menus (id, name, schedule, pricing, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [menu.id, menu.name, menu.schedule, menu.pricing, menu.created_at, menu.updated_at]
      );
    }

    // Insert REAL menu sections
    for (const section of sections) {
      await pool.query(
        'INSERT INTO menu_sections (menu_id, section_key, name) VALUES ($1, $2, $3)',
        [section.menu_id, section.section_key, section.name]
      );
    }

    // Insert REAL menu items
    for (const item of items) {
      await pool.query(
        'INSERT INTO menu_items (id, menu_id, section_key, name, description, price, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [item.id, item.menu_id, item.section_key, item.name, item.description, item.price, item.created_at, item.updated_at]
      );
    }

    // Insert REAL admin users
    for (const admin of admins) {
      await pool.query(
        'INSERT INTO admin_users (username, password_hash, created_at) VALUES ($1, $2, $3)',
        [admin.username, admin.password_hash, admin.created_at]
      );
    }

    console.log('✅ REAL data migration completed!');
    res.json({ 
      success: true, 
      message: 'Real data migration completed successfully!',
      migrated: {
        menus: menus.length,
        sections: sections.length,
        items: items.length,
        admins: admins.length
      }
    });

  } catch (error) {
    console.error('❌ Error migrating real data:', error);
    res.status(500).json({ success: false, message: 'Failed to migrate real data', error: error.message });
  }
});

module.exports = router;
