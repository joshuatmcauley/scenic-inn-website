const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite connection (local)
const dbPath = path.join(__dirname, 'scenic_inn.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 COMPARING LOCAL SQLITE vs RAILWAY DATABASE\n');

async function compareDatabases() {
  try {
    // Get data from local SQLite
    const localMenus = await getSQLiteData('SELECT * FROM menus ORDER BY name');
    const localItems = await getSQLiteData('SELECT * FROM menu_items ORDER BY menu_id, section_key, name');
    
    console.log('📊 LOCAL SQLITE DATABASE:');
    console.log(`   - ${localMenus.length} menus`);
    console.log(`   - ${localItems.length} menu items\n`);
    
    console.log('🍽️ LOCAL MENUS:');
    localMenus.forEach(menu => {
      console.log(`   - ${menu.name} (${menu.id})`);
      console.log(`     Schedule: ${menu.schedule}`);
      console.log(`     Pricing: ${menu.pricing}\n`);
    });
    
    console.log('📋 LOCAL MENU ITEMS (first 10):');
    localItems.slice(0, 10).forEach(item => {
      console.log(`   - ${item.name} - £${item.price} (${item.section_key})`);
    });
    
    if (localItems.length > 10) {
      console.log(`   ... and ${localItems.length - 10} more items\n`);
    }
    
    console.log('🌐 RAILWAY DATABASE:');
    console.log('   Visit these URLs to compare:');
    console.log('   - https://scenic-inn-website-production.up.railway.app/api/menus');
    console.log('   - https://scenic-inn-website-production.up.railway.app/api/menus/test/all-items\n');
    
    console.log('🔍 VERIFICATION STEPS:');
    console.log('1. Check if Railway has the same number of menus and items');
    console.log('2. Compare menu names, schedules, and pricing');
    console.log('3. Check if menu items have the same names and prices');
    console.log('4. Verify section keys match (starters, mains, desserts)');
    
  } catch (error) {
    console.error('❌ Error:', error);
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

// Run the comparison
compareDatabases();
