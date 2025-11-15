// Script to add 'Specials' section to all menus in the database
const { Pool } = require('pg');
require('dotenv').config();

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set.');
  console.error('   Please set it in your .env file or run the SQL directly in DBeaver.');
  console.error('   See: 03-database/add-specials-section.sql');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Railway requires SSL
});

async function addSpecialsSection() {
  try {
    console.log('🔄 Adding "Specials" section to all menus...');
    
    // Get all menu IDs
    const menusResult = await pool.query('SELECT id FROM menus');
    const menus = menusResult.rows;
    
    console.log(`Found ${menus.length} menus`);
    
    // Add 'specials' section to each menu if it doesn't exist
    for (const menu of menus) {
      const checkResult = await pool.query(
        'SELECT id FROM menu_sections WHERE menu_id = $1 AND section_key = $2',
        [menu.id, 'specials']
      );
      
      if (checkResult.rows.length === 0) {
        await pool.query(
          'INSERT INTO menu_sections (menu_id, section_key, name) VALUES ($1, $2, $3)',
          [menu.id, 'specials', 'Specials']
        );
        console.log(`✅ Added "Specials" section to menu: ${menu.id}`);
      } else {
        console.log(`⏭️  Menu "${menu.id}" already has "Specials" section`);
      }
    }
    
    console.log('\n✅ Done! All menus now have a "Specials" section.');
    
    // Verify
    const verifyResult = await pool.query(
      'SELECT menu_id, section_key, name FROM menu_sections WHERE section_key = $1 ORDER BY menu_id',
      ['specials']
    );
    
    console.log(`\n📊 Verification: Found ${verifyResult.rows.length} "Specials" sections:`);
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.menu_id}: ${row.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding Specials section:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
addSpecialsSection();

