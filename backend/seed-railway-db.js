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

async function seedRailwayDatabase() {
  console.log('🚀 Starting Railway database seeding...\n');

  try {
    // Get all data from SQLite
    const menus = await getSQLiteData('SELECT * FROM menus');
    const menuSections = await getSQLiteData('SELECT * FROM menu_sections');
    const menuItems = await getSQLiteData('SELECT * FROM menu_items');
    const adminUsers = await getSQLiteData('SELECT * FROM admin_users');

    console.log(`📊 Found in SQLite:`);
    console.log(`   - ${menus.length} menus`);
    console.log(`   - ${menuSections.length} menu sections`);
    console.log(`   - ${menuItems.length} menu items`);
    console.log(`   - ${adminUsers.length} admin users\n`);

    // Clear existing data in PostgreSQL
    console.log('🧹 Clearing existing Railway database data...');
    await pool.query('DELETE FROM menu_items');
    await pool.query('DELETE FROM menu_sections');
    await pool.query('DELETE FROM menus');
    await pool.query('DELETE FROM admin_users');
    console.log('✅ Cleared existing data\n');

    // Insert menus
    console.log('📝 Inserting menus...');
    for (const menu of menus) {
      await pool.query(
        'INSERT INTO menus (id, name, schedule, pricing, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [menu.id, menu.name, menu.schedule, menu.pricing, menu.created_at, menu.updated_at]
      );
    }
    console.log(`✅ Inserted ${menus.length} menus`);

    // Insert menu sections
    console.log('📝 Inserting menu sections...');
    for (const section of menuSections) {
      await pool.query(
        'INSERT INTO menu_sections (menu_id, section_key, name) VALUES ($1, $2, $3)',
        [section.menu_id, section.section_key, section.name]
      );
    }
    console.log(`✅ Inserted ${menuSections.length} menu sections`);

    // Insert menu items
    console.log('📝 Inserting menu items...');
    for (const item of menuItems) {
      await pool.query(
        'INSERT INTO menu_items (id, menu_id, section_key, name, description, price, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [item.id, item.menu_id, item.section_key, item.name, item.description, item.price, item.created_at, item.updated_at]
      );
    }
    console.log(`✅ Inserted ${menuItems.length} menu items`);

    // Insert admin users
    console.log('📝 Inserting admin users...');
    for (const admin of adminUsers) {
      await pool.query(
        'INSERT INTO admin_users (username, password_hash, created_at) VALUES ($1, $2, $3)',
        [admin.username, admin.password_hash, admin.created_at]
      );
    }
    console.log(`✅ Inserted ${adminUsers.length} admin users`);

    console.log('\n🎉 Railway database seeding completed successfully!');
    console.log('🌐 Your Railway backend should now have all the menu data.');

  } catch (error) {
    console.error('❌ Error seeding Railway database:', error);
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

// Run the seeding
seedRailwayDatabase();
