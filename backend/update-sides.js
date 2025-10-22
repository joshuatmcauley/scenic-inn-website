const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateComesWithSide() {
  try {
    console.log('Updating menu items to come with sides...');
    
    const result = await pool.query(`
      UPDATE menu_items 
      SET comes_with_side = true 
      WHERE section_key IN ('main-course', 'main-courses', 'chicken-dishes', 'fish-dishes', 'burgers', 'loaded-fries')
      AND (name ILIKE '%burger%' OR name ILIKE '%steak%' OR name ILIKE '%chicken%' OR name ILIKE '%fish%' OR name ILIKE '%ribeye%' OR name ILIKE '%sirloin%')
    `);
    
    console.log('Updated', result.rowCount, 'items to come with sides');
    
    // Show which items were updated
    const updatedItems = await pool.query(`
      SELECT name, section_key, comes_with_side 
      FROM menu_items 
      WHERE comes_with_side = true
      ORDER BY section_key, name
    `);
    
    console.log('\nItems that now come with sides:');
    updatedItems.rows.forEach(item => {
      console.log(`- ${item.name} (${item.section_key})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateComesWithSide();
