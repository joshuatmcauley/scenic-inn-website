const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

// SQLite connection (local)
const dbPath = path.join(__dirname, 'scenic_inn.db');
const db = new sqlite3.Database(dbPath);

// Railway API URL
const RAILWAY_API_URL = 'https://scenic-inn-website-production.up.railway.app/api';

async function migrateToRailway() {
  console.log('🚀 Starting REAL data migration to Railway...\n');

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

    // Step 1: Clear fake data from Railway
    console.log('🧹 Step 1: Clearing FAKE data from Railway...');
    try {
      const clearResponse = await axios.post(`${RAILWAY_API_URL}/seed/clear-fake-data`);
      console.log('✅ Fake data cleared from Railway');
    } catch (error) {
      console.log('⚠️  Clear endpoint not available, continuing with migration...');
    }

    // Step 2: Send real data to Railway
    console.log('\n📝 Step 2: Sending REAL data to Railway...');
    const migrationData = {
      menus: realMenus,
      sections: realSections,
      items: realItems,
      admins: realAdmins
    };

    const migrateResponse = await axios.post(`${RAILWAY_API_URL}/seed/migrate-real-data`, migrationData);
    
    if (migrateResponse.data.success) {
      console.log('\n🎉 REAL DATA MIGRATION COMPLETED!');
      console.log('🌐 Your Railway database now has your ACTUAL restaurant menu data!');
      console.log('\n📋 Migration Summary:');
      console.log(`   - ${migrateResponse.data.migrated.menus} real menus migrated`);
      console.log(`   - ${migrateResponse.data.migrated.sections} real menu sections migrated`);
      console.log(`   - ${migrateResponse.data.migrated.items} real menu items migrated`);
      console.log(`   - ${migrateResponse.data.migrated.admins} real admin users migrated`);
      
      console.log('\n🔍 Verify your data:');
      console.log('   - Visit: https://scenic-inn-website-production.up.railway.app/api/menus/test/all-items');
      console.log('   - Check your Netlify frontend database viewer');
    } else {
      console.error('❌ Migration failed:', migrateResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
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

// Run the migration
migrateToRailway();
