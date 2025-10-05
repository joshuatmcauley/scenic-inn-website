const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

const dbPath = path.join(__dirname, 'scenic_inn.db');
const db = new sqlite3.Database(dbPath);

const RAILWAY_API = 'https://scenic-inn-website-production.up.railway.app/api/seed/migrate-real-data';

function all(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function run() {
  try {
    console.log('Extracting Lunch data from SQLite…');
    const menus = await all("SELECT * FROM menus WHERE id='lunch'");
    if (menus.length === 0) {
      console.error('No lunch menu found in SQLite. Aborting.');
      process.exit(1);
    }
    const sections = await all("SELECT * FROM menu_sections WHERE menu_id='lunch'");
    const items = await all("SELECT * FROM menu_items WHERE menu_id='lunch'");
    const admins = []; // not needed

    console.log(`Lunch: ${sections.length} sections, ${items.length} items`);

    // Normalize values
    items.forEach(i => {
      if (i.price === '' || i.price == null) i.price = 0.0;
    });

    console.log('Sending to Railway…');
    const res = await axios.post(RAILWAY_API, { menus, sections, items, admins });
    console.log('Result:', res.data);
  } catch (e) {
    console.error('Migration failed:', e.response?.data || e.message);
  } finally {
    db.close();
  }
}

run();


