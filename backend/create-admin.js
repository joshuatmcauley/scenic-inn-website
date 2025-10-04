const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'scenic_inn.db');
const db = new sqlite3.Database(dbPath);

async function createAdmin() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('2132', 10);
    
    // Insert admin user
    db.run(`
      INSERT OR REPLACE INTO admin_users (id, username, password_hash, created_at)
      VALUES (1, 'josh', ?, CURRENT_TIMESTAMP)
    `, [hashedPassword], function(err) {
      if (err) {
        console.error('Error creating admin:', err);
      } else {
        console.log('✅ Admin user created successfully!');
        console.log('Username: josh');
        console.log('Password: 2132');
        console.log('Hashed password:', hashedPassword);
      }
      db.close();
    });
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

createAdmin();
