const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

// SQLite connection (local)
const dbPath = path.join(__dirname, 'scenic_inn.db');
const db = new sqlite3.Database(dbPath);

// Railway API URL
const RAILWAY_API_URL = 'https://scenic-inn-website-production.up.railway.app/api';

async function debugMigration() {
  console.log('🔍 COMPREHENSIVE MIGRATION DEBUGGING\n');

  try {
    // Step 1: Check SQLite data structure
    console.log('📊 STEP 1: CHECKING SQLITE DATA STRUCTURE');
    console.log('=' .repeat(50));
    
    const tables = await getSQLiteData("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables in SQLite:', tables.map(t => t.name));
    
    // Check each table structure
    for (const table of tables) {
      const structure = await getSQLiteData(`PRAGMA table_info(${table.name})`);
      console.log(`\n${table.name} structure:`);
      structure.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
    }

    // Step 2: Check actual data
    console.log('\n📊 STEP 2: CHECKING ACTUAL DATA');
    console.log('=' .repeat(50));
    
    const menus = await getSQLiteData('SELECT * FROM menus');
    const sections = await getSQLiteData('SELECT * FROM menu_sections');
    const items = await getSQLiteData('SELECT * FROM menu_items');
    const admins = await getSQLiteData('SELECT * FROM admin_users');
    
    console.log(`\nData counts:`);
    console.log(`  - Menus: ${menus.length}`);
    console.log(`  - Sections: ${sections.length}`);
    console.log(`  - Items: ${items.length}`);
    console.log(`  - Admins: ${admins.length}`);

    // Step 3: Show sample data
    console.log('\n📊 STEP 3: SAMPLE DATA');
    console.log('=' .repeat(50));
    
    console.log('\nSample menus:');
    menus.slice(0, 2).forEach(menu => {
      console.log(`  - ${menu.name} (${menu.id})`);
      console.log(`    Schedule: ${menu.schedule}`);
      console.log(`    Pricing: ${menu.pricing || 'NULL'}`);
      console.log(`    Created: ${menu.created_at}`);
    });
    
    console.log('\nSample sections:');
    sections.slice(0, 5).forEach(section => {
      console.log(`  - ${section.name} (${section.section_key}) for ${section.menu_id}`);
    });
    
    console.log('\nSample items:');
    items.slice(0, 5).forEach(item => {
      console.log(`  - ${item.name || 'NO NAME'} - £${item.price || 'NO PRICE'} (${item.section_key})`);
      console.log(`    Description: ${item.description || 'NO DESCRIPTION'}`);
      console.log(`    Menu ID: ${item.menu_id}`);
    });

    // Step 4: Check Railway API
    console.log('\n📊 STEP 4: CHECKING RAILWAY API');
    console.log('=' .repeat(50));
    
    try {
      const healthResponse = await axios.get(`${RAILWAY_API_URL}/health`);
      console.log('✅ Railway API is accessible');
      console.log(`   Status: ${healthResponse.data.status}`);
    } catch (error) {
      console.log('❌ Railway API error:', error.message);
      return;
    }

    // Check current Railway data
    try {
      const menusResponse = await axios.get(`${RAILWAY_API_URL}/menus`);
      console.log(`\nCurrent Railway menus: ${menusResponse.data.data?.length || 0}`);
      
      const itemsResponse = await axios.get(`${RAILWAY_API_URL}/menus/test/all-items`);
      console.log(`Current Railway items: ${itemsResponse.data.items?.length || 0}`);
    } catch (error) {
      console.log('❌ Railway data check error:', error.message);
    }

    // Step 5: Test migration endpoint
    console.log('\n📊 STEP 5: TESTING MIGRATION ENDPOINT');
    console.log('=' .repeat(50));
    
    try {
      const testData = {
        menus: menus.slice(0, 1), // Test with just 1 menu
        sections: sections.filter(s => s.menu_id === menus[0].id),
        items: items.filter(i => i.menu_id === menus[0].id).slice(0, 3), // Test with 3 items
        admins: admins.slice(0, 1)
      };
      
      console.log(`Testing with: ${testData.menus.length} menu, ${testData.sections.length} sections, ${testData.items.length} items`);
      
      const migrateResponse = await axios.post(`${RAILWAY_API_URL}/seed/migrate-real-data`, testData);
      console.log('✅ Test migration successful:', migrateResponse.data.message);
    } catch (error) {
      console.log('❌ Test migration failed:', error.response?.data || error.message);
    }

    // Step 6: Data validation
    console.log('\n📊 STEP 6: DATA VALIDATION');
    console.log('=' .repeat(50));
    
    // Check for problematic data
    const emptyNames = items.filter(item => !item.name || item.name.trim() === '');
    const emptyPrices = items.filter(item => !item.price || item.price === '');
    const invalidMenuIds = items.filter(item => !menus.find(m => m.id === item.menu_id));
    
    console.log(`\nData issues found:`);
    console.log(`  - Items with empty names: ${emptyNames.length}`);
    console.log(`  - Items with empty prices: ${emptyPrices.length}`);
    console.log(`  - Items with invalid menu IDs: ${invalidMenuIds.length}`);
    
    if (emptyNames.length > 0) {
      console.log('\nItems with empty names:');
      emptyNames.slice(0, 3).forEach(item => {
        console.log(`  - ID: ${item.id}, Menu: ${item.menu_id}, Section: ${item.section_key}`);
      });
    }
    
    if (invalidMenuIds.length > 0) {
      console.log('\nItems with invalid menu IDs:');
      invalidMenuIds.slice(0, 3).forEach(item => {
        console.log(`  - Item: ${item.name}, Menu ID: ${item.menu_id}`);
      });
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
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

// Run the debug
debugMigration();
