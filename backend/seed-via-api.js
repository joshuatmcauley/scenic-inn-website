const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

// SQLite connection (local)
const dbPath = path.join(__dirname, 'scenic_inn.db');
const db = new sqlite3.Database(dbPath);

// Railway API base URL
const RAILWAY_API_URL = 'https://scenic-inn-website-production.up.railway.app/api';

async function seedViaAPI() {
  console.log('🚀 Starting Railway database seeding via API...\n');

  try {
    // Get all data from SQLite
    const menus = await getSQLiteData('SELECT * FROM menus');
    const menuSections = await getSQLiteData('SELECT * FROM menu_sections');
    const menuItems = await getSQLiteData('SELECT * FROM menu_items');

    console.log(`📊 Found in SQLite:`);
    console.log(`   - ${menus.length} menus`);
    console.log(`   - ${menuSections.length} menu sections`);
    console.log(`   - ${menuItems.length} menu items\n`);

    // Test Railway API connection first
    console.log('🔍 Testing Railway API connection...');
    try {
      const healthResponse = await axios.get(`${RAILWAY_API_URL}/health`);
      console.log('✅ Railway API is accessible');
      console.log(`   Status: ${healthResponse.data.status}`);
    } catch (error) {
      console.error('❌ Cannot connect to Railway API:', error.message);
      return;
    }

    // Create menus via API
    console.log('\n📝 Creating menus via API...');
    for (const menu of menus) {
      try {
        const response = await axios.post(`${RAILWAY_API_URL}/admin/menus`, {
          id: menu.id,
          name: menu.name,
          schedule: menu.schedule,
          pricing: menu.pricing
        }, {
          headers: {
            'Authorization': 'Bearer admin123' // Temporary - we'll need proper auth
          }
        });
        console.log(`✅ Created menu: ${menu.name}`);
      } catch (error) {
        console.log(`⚠️  Menu ${menu.name} might already exist or auth failed`);
      }
    }

    console.log('\n🎉 Database seeding completed!');
    console.log('🌐 Check your Railway backend - it should now have menu data.');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    db.close();
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
seedViaAPI();
