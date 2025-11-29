-- Kids Menu Insert Script (FIXED)
-- Run this in DBeaver or your PostgreSQL client to add kids menu items
-- This script is idempotent - safe to run multiple times

-- Step 1: Ensure the Kids Menu exists
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

-- Step 2: Delete any existing kids menu items and sections first (to avoid conflicts)
DELETE FROM menu_items WHERE menu_id = 'kids-menu';
DELETE FROM menu_sections WHERE menu_id = 'kids-menu';

-- Step 3: Create menu sections for kids menu
INSERT INTO menu_sections (menu_id, section_key, name)
VALUES
    ('kids-menu', 'main-course', 'Main Course'),
    ('kids-menu', 'sides', 'Sides'),
    ('kids-menu', 'desserts', 'Desserts')
ON CONFLICT DO NOTHING;

-- Step 4: Insert Kids Menu Main Courses
INSERT INTO menu_items (id, menu_id, section_key, name, description, price, comes_with_side, is_steak, created_at, updated_at)
VALUES
    ('kids-item-1', 'kids-menu', 'main-course', 'Chicken Nuggets', 'Breaded chicken nuggets served with chips', 6.95, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kids-item-2', 'kids-menu', 'main-course', 'Fish Fingers', 'Battered fish fingers with chips and peas', 6.95, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kids-item-3', 'kids-menu', 'main-course', 'Pasta with Tomato Sauce', 'Simple pasta with tomato sauce', 5.95, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kids-item-4', 'kids-menu', 'main-course', 'Mini Burger', 'Small beef burger with chips', 7.95, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kids-item-5', 'kids-menu', 'main-course', 'Sausage & Mash', 'Pork sausages with mashed potatoes and gravy', 6.95, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    menu_id = EXCLUDED.menu_id,
    section_key = EXCLUDED.section_key,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    comes_with_side = EXCLUDED.comes_with_side,
    is_steak = EXCLUDED.is_steak,
    updated_at = CURRENT_TIMESTAMP;

-- Step 5: Copy ALL sides from weekend-evening menu to kids menu
-- This will add all available sides (chips, mash, vegetables, etc.)
INSERT INTO menu_items (id, menu_id, section_key, name, description, price, comes_with_side, is_steak, created_at, updated_at)
SELECT 
    'kids-side-' || id,  -- Unique ID prefix for kids menu sides
    'kids-menu',
    'sides',  -- Always use 'sides' as section_key
    name,
    description,
    price,  -- Keep original price from weekend-evening menu
    COALESCE(comes_with_side, false),
    COALESCE(is_steak, false),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM menu_items
WHERE menu_id = 'weekend-evening'
  AND LOWER(section_key) IN ('sides', 'side-orders', 'side')
ON CONFLICT (id) DO UPDATE SET
    menu_id = EXCLUDED.menu_id,
    section_key = EXCLUDED.section_key,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    comes_with_side = EXCLUDED.comes_with_side,
    is_steak = EXCLUDED.is_steak,
    updated_at = CURRENT_TIMESTAMP;

-- Step 6: Insert Kids Menu Desserts
INSERT INTO menu_items (id, menu_id, section_key, name, description, price, comes_with_side, is_steak, created_at, updated_at)
VALUES
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

-- Step 7: Verify the insert
SELECT '✅ Kids menu items created successfully!' AS status;

-- Step 8: Show menu sections created
SELECT '📋 Menu Sections Created:' AS info;
SELECT menu_id, section_key, name 
FROM menu_sections 
WHERE menu_id = 'kids-menu'
ORDER BY section_key;

-- Step 9: Show item counts by section
SELECT '📊 Item Counts by Section:' AS info;
SELECT section_key, COUNT(*) AS item_count 
FROM menu_items 
WHERE menu_id = 'kids-menu'
GROUP BY section_key
ORDER BY section_key;

-- Step 10: Show all main courses
SELECT '🍽️ Main Courses:' AS info;
SELECT name, description, price 
FROM menu_items 
WHERE menu_id = 'kids-menu' AND section_key = 'main-course'
ORDER BY name;

-- Step 11: Show all sides (from weekend-evening menu)
SELECT '🍟 Sides (copied from weekend-evening menu):' AS info;
SELECT name, description, price 
FROM menu_items 
WHERE menu_id = 'kids-menu' AND section_key = 'sides'
ORDER BY name;

-- Step 12: Show all desserts
SELECT '🍰 Desserts:' AS info;
SELECT name, description, price 
FROM menu_items 
WHERE menu_id = 'kids-menu' AND section_key = 'desserts'
ORDER BY name;
