-- Kids Menu Insert Script
-- Run this in DBeaver or your PostgreSQL client to add the kids menu
-- This script is idempotent - safe to run multiple times

-- Insert the Kids Menu
INSERT INTO menus (id, name, schedule, pricing, created_at, updated_at)
VALUES (
    'kids-menu',
    'Kids Menu',
    'Available for children ages 2-15',
    '{"pricing_type": "individual"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    schedule = EXCLUDED.schedule,
    pricing = EXCLUDED.pricing,
    updated_at = CURRENT_TIMESTAMP;

-- Delete any existing kids menu items first (to avoid conflicts)
DELETE FROM menu_items WHERE menu_id = 'kids-menu';

-- Insert Kids Menu Items (8 sample items)
-- Main Courses
INSERT INTO menu_items (id, menu_id, section_key, name, description, price, comes_with_side, is_steak, created_at, updated_at)
VALUES
    -- Main Courses
    ('kids-item-1', 'kids-menu', 'main-course', 'Chicken Nuggets', 'Breaded chicken nuggets served with chips', 6.95, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kids-item-2', 'kids-menu', 'main-course', 'Fish Fingers', 'Battered fish fingers with chips and peas', 6.95, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kids-item-3', 'kids-menu', 'main-course', 'Pasta with Tomato Sauce', 'Simple pasta with tomato sauce', 5.95, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kids-item-4', 'kids-menu', 'main-course', 'Mini Burger', 'Small beef burger with chips', 7.95, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kids-item-5', 'kids-menu', 'main-course', 'Sausage & Mash', 'Pork sausages with mashed potatoes and gravy', 6.95, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Sides (that come with meals)
    ('kids-item-6', 'kids-menu', 'sides', 'Chips', 'Crispy chips', 2.50, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kids-item-7', 'kids-menu', 'sides', 'Vegetables', 'Mixed vegetables', 2.50, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Desserts
    ('kids-item-8', 'kids-menu', 'desserts', 'Ice Cream', 'Vanilla ice cream with chocolate sauce', 3.95, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    menu_id = EXCLUDED.menu_id,
    section_key = EXCLUDED.section_key,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    comes_with_side = EXCLUDED.comes_with_side,
    is_steak = EXCLUDED.is_steak,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the insert
SELECT 'Kids menu created successfully!' AS status;
SELECT COUNT(*) AS total_items FROM menu_items WHERE menu_id = 'kids-menu';

