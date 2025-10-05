const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// PostgreSQL connection (Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// SQLite connection (local)
const dbPath = path.join(__dirname, 'scenic_inn.db');
const db = new sqlite3.Database(dbPath);

async function migrateRealData() {
  console.log('🚀 Starting REAL data migration from SQLite to Railway...\n');

  try {
    // Get REAL data from SQLite
    const realMenus = await getSQLiteData('SELECT * FROM menus ORDER BY name');
    const realSections = await getSQLiteData('SELECT * FROM menu_sections ORDER BY menu_id, section_key');
    const realItems = await getSQLiteData('SELECT * FROM menu_items ORDER BY menu_id, section_key, name');
    const realAdmins = await getSQLiteData('SELECT * FROM admin_users');

    console.log(`📊 REAL SQLite Data Found:`);
    console.log(`   - ${realMenus.length} menus`);
    console.log(`   - ${realSections.length} menu sections`);
    console.log(`   - ${realItems.length} menu items`);
    console.log(`   - ${realAdmins.length} admin users\n`);

    // Clear FAKE data from Railway
    console.log('🧹 Clearing FAKE sample data from Railway...');
    await pool.query('DELETE FROM menu_items');
    await pool.query('DELETE FROM menu_sections');
    await pool.query('DELETE FROM menus');
    await pool.query('DELETE FROM admin_users');
    console.log('✅ Cleared all fake data\n');

    // Insert REAL menus
    console.log('📝 Inserting REAL menus...');
    for (const menu of realMenus) {
      await pool.query(
        'INSERT INTO menus (id, name, schedule, pricing, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [menu.id, menu.name, menu.schedule, menu.pricing, menu.created_at, menu.updated_at]
      );
      console.log(`   ✅ ${menu.name} (${menu.id})`);
    }

    // Insert REAL menu sections
    console.log('\n📝 Inserting REAL menu sections...');
    for (const section of realSections) {
      await pool.query(
        'INSERT INTO menu_sections (menu_id, section_key, name) VALUES ($1, $2, $3)',
        [section.menu_id, section.section_key, section.name]
      );
      console.log(`   ✅ ${section.name} (${section.section_key}) for ${section.menu_id}`);
    }

    // Insert REAL menu items
    console.log('\n📝 Inserting REAL menu items...');
    for (const item of realItems) {
      await pool.query(
        'INSERT INTO menu_items (id, menu_id, section_key, name, description, price, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [item.id, item.menu_id, item.section_key, item.name, item.description, item.price, item.created_at, item.updated_at]
      );
      console.log(`   ✅ ${item.name} - £${item.price} (${item.section_key})`);
    }

    // Insert REAL admin users
    console.log('\n📝 Inserting REAL admin users...');
    for (const admin of realAdmins) {
      await pool.query(
        'INSERT INTO admin_users (username, password_hash, created_at) VALUES ($1, $2, $3)',
        [admin.username, admin.password_hash, admin.created_at]
      );
      console.log(`   ✅ Admin: ${admin.username}`);
    }

    console.log('\n🎉 REAL DATA MIGRATION COMPLETED!');
    console.log('🌐 Your Railway database now has your ACTUAL restaurant menu data!');
    console.log('\n📋 Summary:');
    console.log(`   - ${realMenus.length} real menus migrated`);
    console.log(`   - ${realSections.length} real menu sections migrated`);
    console.log(`   - ${realItems.length} real menu items migrated`);
    console.log(`   - ${realAdmins.length} real admin users migrated`);

  } catch (error) {
    console.error('❌ Error migrating real data:', error);
  } finally {
    // Close connections
    db.close();
    await pool.end();
  }
}

// Helper function to get data from SQLite
function getSQLiteData(query) {
  return new Promise((resolve, reject) => {
    db.all(query, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Run the migration
migrateRealData();
