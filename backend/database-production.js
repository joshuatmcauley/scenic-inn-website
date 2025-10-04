const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menus (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        schedule TEXT NOT NULL,
        pricing TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_sections (
        id SERIAL PRIMARY KEY,
        menu_id TEXT NOT NULL,
        section_key TEXT NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (menu_id) REFERENCES menus (id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        menu_id TEXT NOT NULL,
        section_key TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_id) REFERENCES menus (id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        party_size INTEGER NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        contact_name TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        special_requests TEXT,
        menu_selections JSONB,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables created successfully');
    
    // Check if we need to seed data
    const menuCount = await pool.query('SELECT COUNT(*) FROM menus');
    if (menuCount.rows[0].count === '0') {
      console.log('🌱 Seeding database with initial data...');
      await seedDatabase();
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Seed database with initial data
async function seedDatabase() {
  try {
    // Insert sample menus
    const menus = [
      {
        id: 'sunday-lunch',
        name: 'Sunday Lunch Menu',
        schedule: 'Sunday 12pm-5pm',
        pricing: '£25 per person'
      },
      {
        id: 'weekend-evening',
        name: 'Weekend Evening Menu',
        schedule: 'Friday-Sunday 5pm-9pm',
        pricing: '£35 per person'
      },
      {
        id: 'tea-time',
        name: 'Tea Time Menu',
        schedule: 'Daily 2pm-4pm',
        pricing: '£15 per person'
      },
      {
        id: 'lunch',
        name: 'Lunch Menu',
        schedule: 'Monday-Friday 12pm-4:45pm',
        pricing: '£20 per person'
      }
    ];

    for (const menu of menus) {
      await pool.query(
        'INSERT INTO menus (id, name, schedule, pricing) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [menu.id, menu.name, menu.schedule, menu.pricing]
      );
    }

    // Insert sample menu sections
    const sections = [
      { menu_id: 'sunday-lunch', section_key: 'main', name: 'Main Course' },
      { menu_id: 'sunday-lunch', section_key: 'dessert', name: 'Dessert' },
      { menu_id: 'weekend-evening', section_key: 'main', name: 'Main Course' },
      { menu_id: 'weekend-evening', section_key: 'dessert', name: 'Dessert' },
      { menu_id: 'tea-time', section_key: 'main', name: 'Tea Selection' },
      { menu_id: 'lunch', section_key: 'main', name: 'Main Course' }
    ];

    for (const section of sections) {
      await pool.query(
        'INSERT INTO menu_sections (menu_id, section_key, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [section.menu_id, section.section_key, section.name]
      );
    }

    // Insert sample menu items
    const items = [
      { id: '1', menu_id: 'sunday-lunch', section_key: 'main', name: 'Roast Beef', description: 'Traditional Sunday roast', price: 25.00 },
      { id: '2', menu_id: 'sunday-lunch', section_key: 'main', name: 'Roast Chicken', description: 'Herb-crusted chicken', price: 22.00 },
      { id: '3', menu_id: 'sunday-lunch', section_key: 'main', name: 'Vegetable Wellington', description: 'Seasonal vegetables in pastry', price: 20.00 },
      { id: '4', menu_id: 'sunday-lunch', section_key: 'dessert', name: 'Sticky Toffee Pudding', description: 'Classic dessert with custard', price: 8.00 },
      { id: '5', menu_id: 'sunday-lunch', section_key: 'dessert', name: 'Apple Crumble', description: 'Homemade with vanilla ice cream', price: 7.00 },
      { id: '6', menu_id: 'weekend-evening', section_key: 'main', name: 'Beef Fillet', description: '8oz fillet with red wine jus', price: 35.00 },
      { id: '7', menu_id: 'weekend-evening', section_key: 'main', name: 'Salmon', description: 'Pan-seared with lemon butter', price: 28.00 },
      { id: '8', menu_id: 'weekend-evening', section_key: 'dessert', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with ice cream', price: 9.00 },
      { id: '9', menu_id: 'tea-time', section_key: 'main', name: 'Afternoon Tea', description: 'Sandwiches, scones, and cakes', price: 15.00 },
      { id: '10', menu_id: 'tea-time', section_key: 'main', name: 'Cream Tea', description: 'Scones with jam and cream', price: 8.00 },
      { id: '11', menu_id: 'lunch', section_key: 'main', name: 'Fish and Chips', description: 'Beer-battered cod with chips', price: 18.00 },
      { id: '12', menu_id: 'lunch', section_key: 'main', name: 'Chicken Caesar Salad', description: 'Fresh salad with grilled chicken', price: 16.00 },
      { id: '13', menu_id: 'lunch', section_key: 'main', name: 'Beef Burger', description: '8oz burger with fries', price: 17.00 }
    ];

    for (const item of items) {
      await pool.query(
        'INSERT INTO menu_items (id, menu_id, section_key, name, description, price) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
        [item.id, item.menu_id, item.section_key, item.name, item.description, item.price]
      );
    }

    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Database helper functions
const dbHelpers = {
  // Get all menus
  getAllMenus: async () => {
    const result = await pool.query('SELECT * FROM menus ORDER BY name');
    return result.rows;
  },

  // Get menu by ID
  getMenuById: async (id) => {
    const result = await pool.query('SELECT * FROM menus WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Get menu items by menu ID
  getMenuItems: async (menuId) => {
    const result = await pool.query(`
      SELECT mi.*, ms.name as section_name 
      FROM menu_items mi 
      JOIN menu_sections ms ON mi.menu_id = ms.menu_id AND mi.section_key = ms.section_key 
      WHERE mi.menu_id = $1 
      ORDER BY ms.section_key, mi.name
    `, [menuId]);
    return result.rows;
  },

  // Get all menu items
  getAllMenuItems: async () => {
    const result = await pool.query(`
      SELECT mi.*, ms.name as section_name 
      FROM menu_items mi 
      JOIN menu_sections ms ON mi.menu_id = ms.menu_id AND mi.section_key = ms.section_key 
      ORDER BY mi.menu_id, ms.section_key, mi.name
    `);
    return result.rows;
  },

  // Create admin user
  createAdminUser: async (username, passwordHash, email) => {
    const result = await pool.query(
      'INSERT INTO admin_users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING *',
      [username, passwordHash, email]
    );
    return result.rows[0];
  },

  // Get admin user by username
  getAdminByUsername: async (username) => {
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    return result.rows[0];
  },

  // Get admin user by ID
  getAdminById: async (id) => {
    const result = await pool.query('SELECT * FROM admin_users WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Create booking
  createBooking: async (bookingData) => {
    const result = await pool.query(
      'INSERT INTO bookings (party_size, date, time, contact_name, contact_email, special_requests, menu_selections) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [bookingData.partySize, bookingData.date, bookingData.time, bookingData.contactName, bookingData.contactEmail, bookingData.specialRequests, JSON.stringify(bookingData.menuSelections)]
    );
    return result.rows[0];
  }
};

module.exports = {
  pool,
  initializeDatabase,
  dbHelpers
};
