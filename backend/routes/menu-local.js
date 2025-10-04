// Local menu system connected to SQLite database
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '..', 'scenic_inn.db');
const db = new sqlite3.Database(dbPath);

// Get all menus
router.get('/', (req, res) => {
    try {
        db.all('SELECT * FROM menus ORDER BY name', (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch menus from database'
                });
            }
            
            res.json(rows);
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menus'
        });
    }
});

// Get specific menu by ID
router.get('/:id', (req, res) => {
    try {
        const menuId = req.params.id;
        
        db.get('SELECT * FROM menus WHERE id = ?', [menuId], (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch menu from database'
                });
            }
            
            if (!row) {
                return res.status(404).json({
                    success: false,
                    error: 'Menu not found'
                });
            }
            
            res.json(row);
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menu'
        });
    }
});

// Get menu items for a specific menu
router.get('/:id/items', (req, res) => {
    try {
        const menuId = req.params.id;
        
        // First get all sections for this menu
        db.all(`
            SELECT DISTINCT section_key
            FROM menu_items
            WHERE menu_id = ? AND section_key != '' AND name != ''
            ORDER BY section_key
        `, [menuId], (err, sections) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch menu sections from database'
                });
            }
            
            // For each section, get the items
            const sectionsWithItems = sections.map(section => {
                return new Promise((resolve, reject) => {
                    db.all(`
                        SELECT id, name, description, price
                        FROM menu_items
                        WHERE menu_id = ? AND section_key = ? AND name != ''
                        ORDER BY id
                    `, [menuId, section.section_key], (err, items) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({
                                name: section.section_key,
                                items: items
                            });
                        }
                    });
                });
            });
            
            Promise.all(sectionsWithItems)
                .then(results => {
                    res.json(results);
                })
                .catch(error => {
                    console.error('Error fetching menu items:', error);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to fetch menu items from database'
                    });
                });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menu items'
        });
    }
});

// Get menu for specific date/time
router.get('/for-date/:date', (req, res) => {
    try {
        const date = new Date(req.params.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Get all menus and filter by day (this is a simplified version)
        // In a real implementation, you'd have more sophisticated date/time logic
        db.all('SELECT * FROM menus ORDER BY name', (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch menus for date from database'
                });
            }
            
            res.json({
                success: true,
                data: rows,
                day: dayName
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menus for date'
        });
    }
});

// Test endpoint to see all menu items
router.get('/test/all-items', (req, res) => {
    try {
        db.all('SELECT * FROM menu_items ORDER BY menu_id, section_key, id', (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch menu items from database',
                    details: err.message
                });
            }
            
            res.json({
                success: true,
                count: rows.length,
                items: rows
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menu items',
            details: error.message
        });
    }
});

module.exports = router;
