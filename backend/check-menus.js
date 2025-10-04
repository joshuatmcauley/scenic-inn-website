const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'scenic_inn.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking menus in database...\n');

// Check menus table
db.all('SELECT * FROM menus', (err, rows) => {
    if (err) {
        console.error('Error reading menus:', err);
    } else {
        console.log('Menus found:', rows.length);
        rows.forEach(menu => {
            console.log(`- ${menu.name} (${menu.id}) - ${menu.schedule}`);
        });
    }
});

// Check menu_sections table
db.all('SELECT * FROM menu_sections', (err, rows) => {
    if (err) {
        console.error('Error reading menu_sections:', err);
    } else {
        console.log('\nMenu sections found:', rows.length);
        rows.forEach(section => {
            console.log(`- ${section.name} (${section.section_key}) for menu ${section.menu_id}`);
        });
    }
});

// Check menu_items table
db.all('SELECT * FROM menu_items', (err, rows) => {
    if (err) {
        console.error('Error reading menu_items:', err);
    } else {
        console.log('\nMenu items found:', rows.length);
        rows.forEach(item => {
            console.log(`- ${item.name} - £${item.price} (${item.section_key})`);
        });
    }
    
    // Close database
    db.close();
});
