const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'scenic_inn.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Menus table
      db.run(`
        CREATE TABLE IF NOT EXISTS menus (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          schedule TEXT NOT NULL,
          pricing TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Menu sections table
      db.run(`
        CREATE TABLE IF NOT EXISTS menu_sections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          menu_id TEXT NOT NULL,
          section_key TEXT NOT NULL,
          name TEXT NOT NULL,
          FOREIGN KEY (menu_id) REFERENCES menus (id) ON DELETE CASCADE
        )
      `);

      // Menu items table
      db.run(`
        CREATE TABLE IF NOT EXISTS menu_items (
          id TEXT PRIMARY KEY,
          menu_id TEXT NOT NULL,
          section_key TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (menu_id) REFERENCES menus (id) ON DELETE CASCADE
        )
      `);

      // Admin users table
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

const dbHelpers = {
  // Menu operations
  getAllMenus: () => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT m.*, 
               json_group_object(
                 ms.section_key,
                 json_object(
                   'name', ms.name,
                   'items', (
                     SELECT json_group_array(
                       json_object(
                         'id', mi.id,
                         'name', mi.name,
                         'description', mi.description,
                         'price', mi.price
                       )
                     )
                     FROM menu_items mi 
                     WHERE mi.menu_id = m.id AND mi.section_key = ms.section_key
                   )
                 )
               ) as sections
        FROM menus m
        LEFT JOIN menu_sections ms ON m.id = ms.menu_id
        GROUP BY m.id
        ORDER BY m.name
      `, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const menus = rows.map(row => ({
            id: row.id,
            name: row.name,
            schedule: row.schedule,
            pricing: row.pricing ? JSON.parse(row.pricing) : null,
            sections: row.sections ? JSON.parse(row.sections) : {},
            created_at: row.created_at,
            updated_at: row.updated_at
          }));
          resolve(menus);
        }
      });
    });
  },

  getMenuById: (menuId) => {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT m.*, 
               json_group_object(
                 ms.section_key,
                 json_object(
                   'name', ms.name,
                   'items', (
                     SELECT json_group_array(
                       json_object(
                         'id', mi.id,
                         'name', mi.name,
                         'description', mi.description,
                         'price', mi.price
                       )
                     )
                     FROM menu_items mi 
                     WHERE mi.menu_id = m.id AND mi.section_key = ms.section_key
                   )
                 )
               ) as sections
        FROM menus m
        LEFT JOIN menu_sections ms ON m.id = ms.menu_id
        WHERE m.id = ?
        GROUP BY m.id
      `, [menuId], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          const menu = {
            id: row.id,
            name: row.name,
            schedule: row.schedule,
            pricing: row.pricing ? JSON.parse(row.pricing) : null,
            sections: row.sections ? JSON.parse(row.sections) : {},
            created_at: row.created_at,
            updated_at: row.updated_at
          };
          resolve(menu);
        }
      });
    });
  },

  createMenu: (menuData) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run(`
          INSERT INTO menus (id, name, schedule, pricing)
          VALUES (?, ?, ?, ?)
        `, [menuData.id, menuData.name, menuData.schedule, 
            menuData.pricing ? JSON.stringify(menuData.pricing) : null], function(err) {
          if (err) {
            reject(err);
            return;
          }

          // Insert sections
          if (menuData.sections) {
            const sectionStmt = db.prepare(`
              INSERT INTO menu_sections (menu_id, section_key, name)
              VALUES (?, ?, ?)
            `);

            const itemStmt = db.prepare(`
              INSERT INTO menu_items (id, menu_id, section_key, name, description, price)
              VALUES (?, ?, ?, ?, ?, ?)
            `);

            for (const [sectionKey, section] of Object.entries(menuData.sections)) {
              sectionStmt.run([menuData.id, sectionKey, section.name]);

              if (section.items) {
                for (const item of section.items) {
                  itemStmt.run([item.id, menuData.id, sectionKey, item.name, item.description, item.price]);
                }
              }
            }

            sectionStmt.finalize();
            itemStmt.finalize();
          }

          resolve({ id: menuData.id, ...menuData });
        });
      });
    });
  },

  updateMenu: (menuId, menuData) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Update menu basic info
        db.run(`
          UPDATE menus 
          SET name = ?, schedule = ?, pricing = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [menuData.name, menuData.schedule, 
            menuData.pricing ? JSON.stringify(menuData.pricing) : null, menuId], (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Delete existing sections and items
          db.run(`DELETE FROM menu_items WHERE menu_id = ?`, [menuId]);
          db.run(`DELETE FROM menu_sections WHERE menu_id = ?`, [menuId]);

          // Insert new sections and items
          if (menuData.sections) {
            const sectionStmt = db.prepare(`
              INSERT INTO menu_sections (menu_id, section_key, name)
              VALUES (?, ?, ?)
            `);

            const itemStmt = db.prepare(`
              INSERT INTO menu_items (id, menu_id, section_key, name, description, price)
              VALUES (?, ?, ?, ?, ?, ?)
            `);

            for (const [sectionKey, section] of Object.entries(menuData.sections)) {
              sectionStmt.run([menuId, sectionKey, section.name]);

              if (section.items) {
                for (const item of section.items) {
                  itemStmt.run([item.id, menuId, sectionKey, item.name, item.description, item.price]);
                }
              }
            }

            sectionStmt.finalize();
            itemStmt.finalize();
          }

          resolve({ id: menuId, ...menuData });
        });
      });
    });
  },

  deleteMenu: (menuId) => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM menus WHERE id = ?`, [menuId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deleted: this.changes > 0 });
        }
      });
    });
  }
};

module.exports = {
  db,
  initializeDatabase,
  dbHelpers
};
