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

    // Insert REAL menus first (required for foreign keys)
    console.log('📝 Inserting REAL menus...');
        for (const menu of menus) {
      // Handle null pricing and timestamps
      const pricing = menu.pricing || null;
      const createdAt = menu.created_at || new Date().toISOString();
      const updatedAt = menu.updated_at || new Date().toISOString();
      
          await pool.query(
            'INSERT INTO menus (id, name, schedule, pricing, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
            [menu.id, menu.name, menu.schedule, pricing, createdAt, updatedAt]
          );
      console.log(`   ✅ Menu: ${menu.name}`);
    }

    // Insert REAL menu sections second
    console.log('📝 Inserting REAL menu sections...');
        for (const section of sections) {
          await pool.query(
            'INSERT INTO menu_sections (menu_id, section_key, name) VALUES ($1, $2, $3) ON CONFLICT (menu_id, section_key) DO NOTHING',
            [section.menu_id, section.section_key, section.name]
          );
      console.log(`   ✅ Section: ${section.name} for ${section.menu_id}`);
    }

    // Insert REAL menu items last (depends on menus and sections)
    console.log('📝 Inserting REAL menu items...');
        for (const item of items) {
      // Handle empty or null prices and timestamps
      const price = item.price && item.price !== '' ? parseFloat(item.price) : 0.00;
      const createdAt = item.created_at || new Date().toISOString();
      const updatedAt = item.updated_at || new Date().toISOString();
      
          await pool.query(
            'INSERT INTO menu_items (id, menu_id, section_key, name, description, price, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
            [item.id, item.menu_id, item.section_key, item.name, item.description, price, createdAt, updatedAt]
          );
      console.log(`   ✅ Item: ${item.name} - £${price}`);
    }

    // Insert REAL admin users
    for (const admin of admins) {
      const createdAt = admin.created_at || new Date().toISOString();
      await pool.query(
        'INSERT INTO admin_users (username, password_hash, created_at) VALUES ($1, $2, $3)',
        [admin.username, admin.password_hash, createdAt]
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

// Replace a specific menu's sections/items (idempotent)
// Body: { menus: [menu?], sections: [...], items: [...] }
router.post('/replace-menu/:menuId', async (req, res) => {
  const { menuId } = req.params;
  const { menus = [], sections = [], items = [] } = req.body;
  try {
    await pool.query('BEGIN');

    // Ensure menu row exists (insert ignore duplicate)
    const menu = menus.find(m => m.id === menuId);
    if (menu) {
      const pricing = menu.pricing || null;
      const createdAt = menu.created_at || new Date().toISOString();
      const updatedAt = menu.updated_at || new Date().toISOString();
      await pool.query(
        'INSERT INTO menus (id, name, schedule, pricing, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING',
        [menu.id, menu.name, menu.schedule, pricing, createdAt, updatedAt]
      );
    }

    // Remove existing data for this menu
    await pool.query('DELETE FROM menu_items WHERE menu_id = $1', [menuId]);
    await pool.query('DELETE FROM menu_sections WHERE menu_id = $1', [menuId]);

    // Insert sections
    for (const section of sections.filter(s => s.menu_id === menuId)) {
      await pool.query(
        'INSERT INTO menu_sections (menu_id, section_key, name) VALUES ($1,$2,$3)',
        [section.menu_id, section.section_key, section.name]
      );
    }

    // Insert items
    for (const item of items.filter(i => i.menu_id === menuId)) {
      const price = item.price && item.price !== '' ? parseFloat(item.price) : 0.0;
      const createdAt = item.created_at || new Date().toISOString();
      const updatedAt = item.updated_at || new Date().toISOString();
      await pool.query(
        'INSERT INTO menu_items (id, menu_id, section_key, name, description, price, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [item.id, item.menu_id, item.section_key, item.name, item.description, price, createdAt, updatedAt]
      );
    }

    await pool.query('COMMIT');
    res.json({ success: true, message: `Menu ${menuId} replaced`, sections: sections.length, items: items.length });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error replacing menu:', error);
    res.status(500).json({ success: false, message: 'Failed to replace menu', error: error.message });
  }
});
