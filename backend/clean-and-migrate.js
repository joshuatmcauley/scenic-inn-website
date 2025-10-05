const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

// SQLite connection (local)
const dbPath = path.join(__dirname, 'scenic_inn.db');
const db = new sqlite3.Database(dbPath);

// Railway API URL
const RAILWAY_API_URL = 'https://scenic-inn-website-production.up.railway.app/api';

async function cleanAndMigrate() {
  console.log('🧹 CLEANING AND MIGRATING DATA\n');

  try {
    // Step 1: Get raw data from SQLite
    const rawMenus = await getSQLiteData('SELECT * FROM menus');
    const rawSections = await getSQLiteData('SELECT * FROM menu_sections');
    const rawItems = await getSQLiteData('SELECT * FROM menu_items');
    const rawAdmins = await getSQLiteData('SELECT * FROM admin_users');

    console.log(`📊 Raw data: ${rawMenus.length} menus, ${rawSections.length} sections, ${rawItems.length} items, ${rawAdmins.length} admins`);

    // Step 2: Clean the data
    console.log('\n🧹 CLEANING DATA...');
    
    // Clean menus (they look good)
    const cleanMenus = rawMenus.filter(menu => menu.id && menu.name);
    console.log(`✅ Clean menus: ${cleanMenus.length}`);

    // Clean sections (they look good)
    const cleanSections = rawSections.filter(section => 
      section.menu_id && 
      section.section_key && 
      section.name &&
      cleanMenus.find(m => m.id === section.menu_id) // Only sections for valid menus
    );
    console.log(`✅ Clean sections: ${cleanSections.length}`);

    // Clean items - remove empty names, invalid menu IDs, and fix prices
    const cleanItems = rawItems.filter(item => 
      item.name && 
      item.name.trim() !== '' && 
      item.menu_id && 
      item.menu_id.trim() !== '' &&
      cleanMenus.find(m => m.id === item.menu_id) // Only items for valid menus
    ).map(item => ({
      ...item,
      price: item.price && item.price !== '' ? parseFloat(item.price) : 0.00,
      name: item.name.trim(),
      description: item.description ? item.description.trim() : null
    }));
    console.log(`✅ Clean items: ${cleanItems.length}`);

    // Clean admins (they look good)
    const cleanAdmins = rawAdmins.filter(admin => admin.username && admin.password_hash);
    console.log(`✅ Clean admins: ${cleanAdmins.length}`);

    // Step 3: Clear Railway database completely
    console.log('\n🧹 CLEARING RAILWAY DATABASE...');
    try {
      await axios.post(`${RAILWAY_API_URL}/seed/clear-fake-data`);
      console.log('✅ Railway database cleared');
    } catch (error) {
      console.log('⚠️  Clear failed, continuing...');
    }

    // Step 4: Migrate clean data
    console.log('\n📝 MIGRATING CLEAN DATA...');
    const migrationData = {
      menus: cleanMenus,
      sections: cleanSections,
      items: cleanItems,
      admins: cleanAdmins
    };

    const migrateResponse = await axios.post(`${RAILWAY_API_URL}/seed/migrate-real-data`, migrationData);
    
    if (migrateResponse.data.success) {
      console.log('\n🎉 CLEAN DATA MIGRATION COMPLETED!');
      console.log('🌐 Your Railway database now has CLEAN restaurant menu data!');
      console.log('\n📋 Migration Summary:');
      console.log(`   - ${migrateResponse.data.migrated.menus} clean menus migrated`);
      console.log(`   - ${migrateResponse.data.migrated.sections} clean sections migrated`);
      console.log(`   - ${migrateResponse.data.migrated.items} clean items migrated`);
      console.log(`   - ${migrateResponse.data.migrated.admins} clean admins migrated`);
      
      console.log('\n🔍 Verify your data:');
      console.log('   - Visit: https://scenic-inn-website-production.up.railway.app/api/menus/test/all-items');
      console.log('   - Check your Netlify frontend database viewer');
    } else {
      console.error('❌ Migration failed:', migrateResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error during clean migration:', error.message);
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

// Run the clean migration
cleanAndMigrate();
