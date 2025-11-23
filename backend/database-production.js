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

    // Create specials table (specials are dishes/items)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS specials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create menu_specials junction table (many-to-many relationship)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_specials (
        special_id TEXT NOT NULL,
        menu_id TEXT NOT NULL,
        PRIMARY KEY (special_id, menu_id),
        FOREIGN KEY (special_id) REFERENCES specials (id) ON DELETE CASCADE,
        FOREIGN KEY (menu_id) REFERENCES menus (id) ON DELETE CASCADE
      )
    `);

    // Create menu_schedule_rules table (defines which menu is active based on day/time)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_schedule_rules (
        id SERIAL PRIMARY KEY,
        menu_id TEXT NOT NULL,
        days_of_week TEXT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        priority INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
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
        booking_reference TEXT UNIQUE,
        party_size INTEGER NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        first_name TEXT,
        last_name TEXT,
        email TEXT NOT NULL,
        phone TEXT,
        experience_id TEXT,
        special_requests TEXT,
        marketing_consent BOOLEAN DEFAULT false,
        preorder_enabled BOOLEAN DEFAULT false,
        preorder JSONB,
        menu_selections JSONB,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add missing columns if they don't exist (for existing tables)
    await pool.query(`
      DO $$ 
      BEGIN
        -- Add booking_reference if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='bookings' AND column_name='booking_reference') THEN
          ALTER TABLE bookings ADD COLUMN booking_reference TEXT UNIQUE;
        END IF;
        
        -- Add first_name if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='bookings' AND column_name='first_name') THEN
          ALTER TABLE bookings ADD COLUMN first_name TEXT;
        END IF;
        
        -- Add last_name if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='bookings' AND column_name='last_name') THEN
          ALTER TABLE bookings ADD COLUMN last_name TEXT;
        END IF;
        
        -- Add phone if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='bookings' AND column_name='phone') THEN
          ALTER TABLE bookings ADD COLUMN phone TEXT;
        END IF;
        
        -- Add experience_id if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='bookings' AND column_name='experience_id') THEN
          ALTER TABLE bookings ADD COLUMN experience_id TEXT;
        END IF;
        
        -- Add marketing_consent if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='bookings' AND column_name='marketing_consent') THEN
          ALTER TABLE bookings ADD COLUMN marketing_consent BOOLEAN DEFAULT false;
        END IF;
        
        -- Add preorder_enabled if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='bookings' AND column_name='preorder_enabled') THEN
          ALTER TABLE bookings ADD COLUMN preorder_enabled BOOLEAN DEFAULT false;
        END IF;
        
        -- Add preorder if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='bookings' AND column_name='preorder') THEN
          ALTER TABLE bookings ADD COLUMN preorder JSONB;
        END IF;
        
        -- Add updated_at if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='bookings' AND column_name='updated_at') THEN
          ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
        
        -- Handle old contact_name column - make it nullable
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='contact_name'
                   AND is_nullable = 'NO') THEN
          ALTER TABLE bookings ALTER COLUMN contact_name DROP NOT NULL;
        END IF;
        
        -- Handle old contact_email column - make it nullable  
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='contact_email'
                   AND is_nullable = 'NO') THEN
          ALTER TABLE bookings ALTER COLUMN contact_email DROP NOT NULL;
        END IF;
        
        -- Migrate data from old columns to new columns if they exist
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='contact_name')
           AND EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='bookings' AND column_name='first_name') THEN
          UPDATE bookings SET first_name = COALESCE(first_name, contact_name) WHERE first_name IS NULL AND contact_name IS NOT NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='bookings' AND column_name='contact_email')
           AND EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='bookings' AND column_name='email') THEN
          UPDATE bookings SET email = COALESCE(email, contact_email) WHERE email IS NULL AND contact_email IS NOT NULL;
        END IF;
      END $$;
    `);

    console.log('✅ Database tables created successfully');
    
    // Check if we need to seed data
    const menuCount = await pool.query('SELECT COUNT(*) FROM menus');
    if (menuCount.rows[0].count === '0') {
      console.log('🌱 Seeding database with initial data...');
      await seedDatabase();
    }
    
    // Check if we need to seed schedule rules
    const rulesCount = await pool.query('SELECT COUNT(*) FROM menu_schedule_rules');
    if (rulesCount.rows[0].count === '0') {
      console.log('🌱 Seeding menu schedule rules...');
      await seedScheduleRules();
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Seed menu schedule rules
async function seedScheduleRules() {
  try {
    // Check if menus exist first
    const menuCheck = await pool.query('SELECT id FROM menus LIMIT 1');
    if (menuCheck.rows.length === 0) {
      console.log('⚠️ No menus found, skipping schedule rules seed');
      return;
    }

    // Get menu IDs (they might have different IDs in production)
    const menusResult = await pool.query('SELECT id, name FROM menus');
    const menus = {};
    menusResult.rows.forEach(menu => {
      const nameLower = menu.name.toLowerCase();
      if (nameLower.includes('sunday lunch')) menus['sunday-lunch'] = menu.id;
      else if (nameLower.includes('weekend evening')) menus['weekend-evening'] = menu.id;
      else if (nameLower.includes('tea time')) menus['tea-time'] = menu.id;
      else if (nameLower.includes('christmas dinner')) menus['christmas-dinner'] = menu.id;
      else if (nameLower.includes('christmas lunch')) menus['christmas-lunch'] = menu.id;
      else if (nameLower.includes('lunch') && !nameLower.includes('sunday') && !nameLower.includes('christmas')) menus['lunch'] = menu.id;
    });

    // Default schedule rules based on menu-schedule.txt
    const defaultRules = [
      // Sunday Lunch Menu: Sunday 12:00-17:00 (Priority 10 - highest, checked first)
      {
        menu_id: menus['sunday-lunch'] || 'sunday-lunch',
        days_of_week: '0', // Sunday
        start_time: '12:00:00',
        end_time: '17:00:00',
        priority: 10
      },
      // Weekend Evening Menu: Friday, Saturday, Sunday 17:00-21:00
      {
        menu_id: menus['weekend-evening'] || 'weekend-evening',
        days_of_week: '5,6,0', // Friday, Saturday, Sunday
        start_time: '17:00:00',
        end_time: '21:00:00',
        priority: 5
      },
      // Tea Time Menu: Monday-Thursday 17:00-20:30
      {
        menu_id: menus['tea-time'] || 'tea-time',
        days_of_week: '1,2,3,4', // Monday-Thursday
        start_time: '17:00:00',
        end_time: '20:30:00',
        priority: 3
      },
      // Lunch Menu: Monday-Saturday 12:00-16:45
      {
        menu_id: menus['lunch'] || 'lunch',
        days_of_week: '1,2,3,4,5,6', // Monday-Saturday
        start_time: '12:00:00',
        end_time: '16:45:00',
        priority: 1
      }
    ];

    // Add Christmas menu rules if they exist
    if (menus['christmas-dinner']) {
      defaultRules.push({
        menu_id: menus['christmas-dinner'],
        days_of_week: '0,1,2,3,4,5,6', // All days
        start_time: '17:00:00',
        end_time: '21:00:00',
        priority: 15 // High priority for Christmas
      });
    }

    if (menus['christmas-lunch']) {
      defaultRules.push({
        menu_id: menus['christmas-lunch'],
        days_of_week: '0,1,2,3,4,5,6', // All days
        start_time: '12:00:00',
        end_time: '17:00:00',
        priority: 12 // High priority for Christmas
      });
    }

    for (const rule of defaultRules) {
      // Check if rule already exists
      const existing = await pool.query(`
        SELECT id FROM menu_schedule_rules 
        WHERE menu_id = $1 AND days_of_week = $2 AND start_time = $3 AND end_time = $4
      `, [rule.menu_id, rule.days_of_week, rule.start_time, rule.end_time]);

      if (existing.rows.length === 0) {
        await pool.query(`
          INSERT INTO menu_schedule_rules (menu_id, days_of_week, start_time, end_time, priority, active)
          VALUES ($1, $2, $3, $4, $5, true)
        `, [rule.menu_id, rule.days_of_week, rule.start_time, rule.end_time, rule.priority]);
      }
    }

    console.log('✅ Menu schedule rules seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding schedule rules:', error);
    // Don't throw - this is not critical
  }
}

// Ensure all menus have schedule rules (can be called manually)
async function ensureMenuScheduleRules() {
  try {
    // Get all menus
    const menusResult = await pool.query('SELECT id, name FROM menus');
    const menus = menusResult.rows;
    
    // Get existing rules
    const rulesResult = await pool.query('SELECT menu_id FROM menu_schedule_rules WHERE active = true');
    const menusWithRules = new Set(rulesResult.rows.map(r => r.menu_id));
    
    // Get menu IDs mapped by name
    const menuMap = {};
    menus.forEach(menu => {
      const nameLower = menu.name.toLowerCase();
      if (nameLower.includes('sunday lunch')) menuMap['sunday-lunch'] = menu.id;
      else if (nameLower.includes('weekend evening')) menuMap['weekend-evening'] = menu.id;
      else if (nameLower.includes('tea time')) menuMap['tea-time'] = menu.id;
      else if (nameLower.includes('christmas dinner')) menuMap['christmas-dinner'] = menu.id;
      else if (nameLower.includes('christmas lunch')) menuMap['christmas-lunch'] = menu.id;
      else if (nameLower.includes('lunch') && !nameLower.includes('sunday') && !nameLower.includes('christmas')) menuMap['lunch'] = menu.id;
    });
    
    const rulesToAdd = [];
    
    // Add default rules for menus that don't have them
    if (menuMap['sunday-lunch'] && !menusWithRules.has(menuMap['sunday-lunch'])) {
      rulesToAdd.push({
        menu_id: menuMap['sunday-lunch'],
        days_of_week: '0',
        start_time: '12:00:00',
        end_time: '17:00:00',
        priority: 10
      });
    }
    
    if (menuMap['weekend-evening'] && !menusWithRules.has(menuMap['weekend-evening'])) {
      rulesToAdd.push({
        menu_id: menuMap['weekend-evening'],
        days_of_week: '5,6,0',
        start_time: '17:00:00',
        end_time: '21:00:00',
        priority: 5
      });
    }
    
    if (menuMap['tea-time'] && !menusWithRules.has(menuMap['tea-time'])) {
      rulesToAdd.push({
        menu_id: menuMap['tea-time'],
        days_of_week: '1,2,3,4',
        start_time: '17:00:00',
        end_time: '20:30:00',
        priority: 3
      });
    }
    
    if (menuMap['lunch'] && !menusWithRules.has(menuMap['lunch'])) {
      rulesToAdd.push({
        menu_id: menuMap['lunch'],
        days_of_week: '1,2,3,4,5,6',
        start_time: '12:00:00',
        end_time: '16:45:00',
        priority: 1
      });
    }
    
    if (menuMap['christmas-dinner'] && !menusWithRules.has(menuMap['christmas-dinner'])) {
      rulesToAdd.push({
        menu_id: menuMap['christmas-dinner'],
        days_of_week: '0,1,2,3,4,5,6',
        start_time: '17:00:00',
        end_time: '21:00:00',
        priority: 15
      });
    }
    
    if (menuMap['christmas-lunch'] && !menusWithRules.has(menuMap['christmas-lunch'])) {
      rulesToAdd.push({
        menu_id: menuMap['christmas-lunch'],
        days_of_week: '0,1,2,3,4,5,6',
        start_time: '12:00:00',
        end_time: '17:00:00',
        priority: 12
      });
    }
    
    // Insert missing rules
    for (const rule of rulesToAdd) {
      await pool.query(`
        INSERT INTO menu_schedule_rules (menu_id, days_of_week, start_time, end_time, priority, active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT DO NOTHING
      `, [rule.menu_id, rule.days_of_week, rule.start_time, rule.end_time, rule.priority]);
    }
    
    if (rulesToAdd.length > 0) {
      console.log(`✅ Added ${rulesToAdd.length} missing schedule rule(s)`);
    } else {
      console.log('✅ All menus already have schedule rules');
    }
    
    return rulesToAdd.length;
  } catch (error) {
    console.error('❌ Error ensuring menu schedule rules:', error);
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

  // Get menu items by menu ID (tolerant if a section row is missing)
  getMenuItems: async (menuId) => {
    const result = await pool.query(`
      SELECT 
        mi.*, 
        COALESCE(ms.name, INITCAP(REPLACE(mi.section_key, '-', ' '))) AS section_name,
        m.pricing_type,
        COALESCE(mi.comes_with_side, false) AS comes_with_side,
        COALESCE(mi.is_steak, false) AS is_steak
      FROM menu_items mi
      LEFT JOIN menu_sections ms
        ON mi.menu_id = ms.menu_id AND mi.section_key = ms.section_key
      LEFT JOIN menus m
        ON mi.menu_id = m.id
      WHERE mi.menu_id = $1
      ORDER BY mi.section_key, mi.name
    `, [menuId]);
    return result.rows;
  },

  // Get menu items for preorder (excludes dips/sauces)
  getMenuItemsForPreorder: async (menuId) => {
    const result = await pool.query(`
      SELECT 
        mi.*, 
        COALESCE(ms.name, INITCAP(REPLACE(mi.section_key, '-', ' '))) AS section_name,
        m.pricing_type,
        COALESCE(mi.comes_with_side, false) AS comes_with_side,
        COALESCE(mi.is_steak, false) AS is_steak
      FROM menu_items mi
      LEFT JOIN menu_sections ms
        ON mi.menu_id = ms.menu_id AND mi.section_key = ms.section_key
      LEFT JOIN menus m
        ON mi.menu_id = m.id
      WHERE mi.menu_id = $1
        AND LOWER(mi.section_key) NOT IN ('dips', 'sauces', 'dip', 'sauce')
        AND LOWER(mi.name) NOT LIKE '%dip%'
        AND LOWER(mi.name) NOT LIKE '%sauce%'
        AND LOWER(mi.name) NOT LIKE '%gravy%'
        AND LOWER(mi.name) NOT LIKE '%mayo%'
        AND LOWER(mi.name) NOT LIKE '%aioli%'
      ORDER BY mi.section_key, mi.name
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

  // Update menu item
  updateMenuItem: async (itemId, itemData) => {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (itemData.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(itemData.name);
    }
    if (itemData.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(itemData.description);
    }
    if (itemData.price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(parseFloat(itemData.price));
    }
    if (itemData.section_key !== undefined) {
      updates.push(`section_key = $${paramCount++}`);
      values.push(itemData.section_key);
    }
    if (itemData.comes_with_side !== undefined) {
      updates.push(`comes_with_side = $${paramCount++}`);
      values.push(itemData.comes_with_side);
    }
    if (itemData.is_steak !== undefined) {
      updates.push(`is_steak = $${paramCount++}`);
      values.push(itemData.is_steak);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(itemId);

    const query = `
      UPDATE menu_items 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Get menu item by ID
  getMenuItemById: async (itemId) => {
    const result = await pool.query(`
      SELECT mi.*, ms.name as section_name 
      FROM menu_items mi 
      LEFT JOIN menu_sections ms ON mi.menu_id = ms.menu_id AND mi.section_key = ms.section_key 
      WHERE mi.id = $1
    `, [itemId]);
    return result.rows[0];
  },

  // Create menu item
  createMenuItem: async (itemData) => {
    // Generate a unique ID if not provided
    const itemId = itemData.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await pool.query(`
      INSERT INTO menu_items (
        id, menu_id, section_key, name, description, price, 
        comes_with_side, is_steak, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      itemId,
      itemData.menu_id,
      itemData.section_key,
      itemData.name,
      itemData.description || null,
      parseFloat(itemData.price),
      itemData.comes_with_side || false,
      itemData.is_steak || false
    ]);
    
    return result.rows[0];
  },

  // Get available sections for a menu
  getMenuSections: async (menuId) => {
    const result = await pool.query(`
      SELECT section_key, name 
      FROM menu_sections 
      WHERE menu_id = $1 
      ORDER BY section_key
    `, [menuId]);
    return result.rows;
  },

  // Delete menu item
  deleteMenuItem: async (itemId) => {
    const result = await pool.query(
      'DELETE FROM menu_items WHERE id = $1 RETURNING *',
      [itemId]
    );
    return result.rows[0];
  },

  // Delete multiple menu items
  deleteMenuItems: async (itemIds) => {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new Error('No item IDs provided');
    }

    const result = await pool.query(
      `DELETE FROM menu_items WHERE id = ANY($1::text[]) RETURNING *`,
      [itemIds]
    );
    return result.rows;
  },

  // Create special (dish/item)
  createSpecial: async (specialData) => {
    const specialId = specialData.id || `special-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Insert special
    const specialResult = await pool.query(`
      INSERT INTO specials (
        id, name, description, price, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      specialId,
      specialData.name || null,
      specialData.description || null,
      specialData.price ? parseFloat(specialData.price) : null
    ]);

    const special = specialResult.rows[0];

    // Link to menus if provided
    if (specialData.menu_ids && Array.isArray(specialData.menu_ids) && specialData.menu_ids.length > 0) {
      const menuLinks = specialData.menu_ids.map(menuId => [specialId, menuId]);
      
      for (const [specId, menuId] of menuLinks) {
        await pool.query(`
          INSERT INTO menu_specials (special_id, menu_id)
          VALUES ($1, $2)
          ON CONFLICT (special_id, menu_id) DO NOTHING
        `, [specId, menuId]);
      }
    }

    // Get associated menus for the special
    const menusResult = await pool.query(`
      SELECT m.id, m.name
      FROM menus m
      INNER JOIN menu_specials ms ON m.id = ms.menu_id
      WHERE ms.special_id = $1
    `, [specialId]);

    special.menus = menusResult.rows;
    return special;
  },

  // Get special by ID
  getSpecialById: async (specialId) => {
    const specialResult = await pool.query(`
      SELECT * FROM specials WHERE id = $1
    `, [specialId]);

    if (specialResult.rows.length === 0) {
      return null;
    }

    const special = specialResult.rows[0];

    // Get associated menus
    const menusResult = await pool.query(`
      SELECT m.id, m.name
      FROM menus m
      INNER JOIN menu_specials ms ON m.id = ms.menu_id
      WHERE ms.special_id = $1
    `, [specialId]);

    special.menus = menusResult.rows;
    return special;
  },

  // Get all specials
  getAllSpecials: async () => {
    const specialsResult = await pool.query(`
      SELECT * FROM specials
      ORDER BY created_at DESC
    `);

    const specials = specialsResult.rows;

    // Get menu associations for each special
    for (const special of specials) {
      const menusResult = await pool.query(`
        SELECT m.id, m.name
        FROM menus m
        INNER JOIN menu_specials ms ON m.id = ms.menu_id
        WHERE ms.special_id = $1
      `, [special.id]);
      special.menus = menusResult.rows;
    }

    return specials;
  },

  // Get all menu schedule rules
  getMenuScheduleRules: async () => {
    const result = await pool.query(`
      SELECT msr.*, m.name as menu_name
      FROM menu_schedule_rules msr
      INNER JOIN menus m ON msr.menu_id = m.id
      WHERE msr.active = true
      ORDER BY msr.priority DESC, msr.start_time ASC
    `);
    return result.rows;
  },

  // Get all menu schedule rules (including inactive)
  getAllMenuScheduleRules: async () => {
    const result = await pool.query(`
      SELECT msr.*, m.name as menu_name
      FROM menu_schedule_rules msr
      INNER JOIN menus m ON msr.menu_id = m.id
      ORDER BY msr.priority DESC, msr.start_time ASC
    `);
    return result.rows;
  },

  // Create or update menu schedule rule
  upsertMenuScheduleRule: async (ruleData) => {
    if (ruleData.id) {
      // Update existing rule
      const result = await pool.query(`
        UPDATE menu_schedule_rules
        SET menu_id = $1, days_of_week = $2, start_time = $3, end_time = $4, 
            priority = $5, active = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `, [
        ruleData.menu_id,
        ruleData.days_of_week,
        ruleData.start_time,
        ruleData.end_time,
        ruleData.priority || 0,
        ruleData.active !== false,
        ruleData.id
      ]);
      return result.rows[0];
    } else {
      // Create new rule
      const result = await pool.query(`
        INSERT INTO menu_schedule_rules (menu_id, days_of_week, start_time, end_time, priority, active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        ruleData.menu_id,
        ruleData.days_of_week,
        ruleData.start_time,
        ruleData.end_time,
        ruleData.priority || 0,
        ruleData.active !== false
      ]);
      return result.rows[0];
    }
  },

  // Delete menu schedule rule
  deleteMenuScheduleRule: async (ruleId) => {
    const result = await pool.query(`
      DELETE FROM menu_schedule_rules WHERE id = $1 RETURNING *
    `, [ruleId]);
    return result.rows[0];
  },

  // Get menu for specific date and time based on schedule rules
  // Returns single menu (for backward compatibility)
  getMenuForDateTime: async (date, time) => {
    const menus = await module.exports.getMenusForDateTime(date, time);
    return menus.length > 0 ? menus[0] : null;
  },

  // Get all menus available for specific date and time (returns array)
  getMenusForDateTime: async (date, time) => {
    const bookingDate = new Date(date);
    const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Parse time (format: "HH:MM" or "HH:MM:SS")
    const timeParts = time.split(':');
    const timeInMinutes = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
    
    // Get all active schedule rules, ordered by priority (highest first)
    const rulesResult = await pool.query(`
      SELECT msr.*, m.id as menu_id, m.name as menu_name, m.schedule, m.pricing
      FROM menu_schedule_rules msr
      INNER JOIN menus m ON msr.menu_id = m.id
      WHERE msr.active = true
      ORDER BY msr.priority DESC, msr.start_time ASC
    `);
    
    const rules = rulesResult.rows;
    const matchingMenus = [];
    
    // Find all matching rules
    for (const rule of rules) {
      const days = rule.days_of_week.split(',').map(d => parseInt(d.trim()));
      
      // Check if this rule applies to the current day
      if (!days.includes(dayOfWeek)) {
        continue;
      }
      
      // Parse rule times
      const startTimeParts = rule.start_time.split(':');
      const endTimeParts = rule.end_time.split(':');
      const startTimeMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
      const endTimeMinutes = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);
      
      // Check if current time is within the rule's time range
      if (timeInMinutes >= startTimeMinutes && timeInMinutes <= endTimeMinutes) {
        matchingMenus.push({
          menu_id: rule.menu_id,
          menu_name: rule.menu_name,
          menu_schedule: rule.schedule,
          menu_pricing: rule.pricing,
          rule_id: rule.id,
          priority: rule.priority
        });
      }
    }
    
    // Return all matching menus (sorted by priority)
    return matchingMenus;
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

  // Create a new booking
  createBooking: async (bookingData) => {
    const bookingReference = bookingData.bookingReference || `SCENIC-${Date.now()}`;
    
    // Prepare data
    const firstName = bookingData.firstName || bookingData.first_name || '';
    const lastName = bookingData.lastName || bookingData.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || firstName || lastName || '';
    const email = bookingData.email || bookingData.contactEmail || bookingData.contact_email || '';
    
    // Check if old columns exist and include them in INSERT
    const checkOldColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name IN ('contact_name', 'contact_email')
    `);
    
    const hasContactName = checkOldColumns.rows.some(r => r.column_name === 'contact_name');
    const hasContactEmail = checkOldColumns.rows.some(r => r.column_name === 'contact_email');
    
    // Build dynamic INSERT based on which columns exist
    let columns = ['booking_reference', 'party_size', 'date', 'time', 'first_name', 'last_name', 'email', 'phone', 'experience_id', 'special_requests', 'marketing_consent', 'preorder_enabled', 'preorder', 'menu_selections', 'status'];
    let values = [
      bookingReference,
      bookingData.partySize || bookingData.party_size,
      bookingData.date,
      bookingData.time,
      firstName,
      lastName,
      email,
      bookingData.phone || bookingData.contactPhone || bookingData.contact_phone || '',
      bookingData.experience_id || bookingData.experienceId || null,
      bookingData.specialRequests || bookingData.special_requests || '',
      bookingData.marketing_consent || bookingData.marketingConsent || false,
      bookingData.preorder_enabled || bookingData.preorderEnabled || false,
      bookingData.preorder ? JSON.stringify(bookingData.preorder) : null,
      bookingData.menu_selections ? JSON.stringify(bookingData.menu_selections) : null,
      bookingData.status || 'pending'
    ];
    
    // Add old columns if they exist (for backward compatibility)
    if (hasContactName) {
      columns.push('contact_name');
      values.push(fullName);
    }
    if (hasContactEmail) {
      columns.push('contact_email');
      values.push(email);
    }
    
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const columnsList = columns.join(', ');
    
    const result = await pool.query(`
      INSERT INTO bookings (${columnsList})
      VALUES (${placeholders})
      RETURNING *
    `, values);
    return result.rows[0];
  },

  // Get all bookings (with optional filters)
  getAllBookings: async (filters = {}) => {
    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.date) {
      query += ` AND date = $${paramCount}`;
      params.push(filters.date);
      paramCount++;
    }

    if (filters.dateFrom) {
      query += ` AND date >= $${paramCount}`;
      params.push(filters.dateFrom);
      paramCount++;
    }

    if (filters.dateTo) {
      query += ` AND date <= $${paramCount}`;
      params.push(filters.dateTo);
      paramCount++;
    }

    query += ' ORDER BY date DESC, time DESC, created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  },

  // Get a single booking by ID
  getBookingById: async (bookingId) => {
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    return result.rows[0];
  },

  // Get booking by reference
  getBookingByReference: async (reference) => {
    const result = await pool.query('SELECT * FROM bookings WHERE booking_reference = $1', [reference]);
    return result.rows[0];
  },

  // Update booking status
  updateBookingStatus: async (bookingId, status) => {
    const result = await pool.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, bookingId]
    );
    return result.rows[0];
  },

  // Delete a booking
  deleteBooking: async (bookingId) => {
    const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING *', [bookingId]);
    return result.rows[0];
  }
};

module.exports = {
  pool,
  initializeDatabase,
  dbHelpers,
  ensureMenuScheduleRules
};
