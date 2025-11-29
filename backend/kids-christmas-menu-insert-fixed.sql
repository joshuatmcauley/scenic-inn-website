-- Kids Christmas Menu Insert Script (FIXED)
-- Creates separate kids versions of Christmas Dinner and Christmas Lunch menus
-- All main courses are priced at £7.50
-- Run this AFTER running the diagnostic script to verify the menu IDs

-- IMPORTANT: First run kids-christmas-menu-diagnostic.sql to check what menu IDs exist!

-- Step 1: Create Kids Christmas Dinner Menu
INSERT INTO menus (id, name, schedule, pricing, created_at, updated_at)
VALUES (
    'kids-christmas-dinner',
    'Kids Christmas Dinner Menu',
    'Available for children - same menu as Christmas Dinner, main courses at £7.50',
    '{"pricing_type": "course"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    schedule = EXCLUDED.schedule,
    pricing = EXCLUDED.pricing,
    updated_at = CURRENT_TIMESTAMP;

-- Step 2: Create Kids Christmas Lunch Menu
INSERT INTO menus (id, name, schedule, pricing, created_at, updated_at)
VALUES (
    'kids-christmas-lunch',
    'Kids Christmas Lunch Menu',
    'Available for children - same menu as Christmas Lunch, main courses at £7.50',
    '{"pricing_type": "course"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    schedule = EXCLUDED.schedule,
    pricing = EXCLUDED.pricing,
    updated_at = CURRENT_TIMESTAMP;

-- Step 3: Delete existing kids Christmas menu sections and items (to avoid conflicts)
DELETE FROM menu_items WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch');
DELETE FROM menu_sections WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch');

-- Step 4: Copy menu sections from Christmas Dinner to Kids Christmas Dinner
-- This handles the case where menu_sections might not exist (some setups don't use it)
INSERT INTO menu_sections (menu_id, section_key, name, display_order)
SELECT DISTINCT
    'kids-christmas-dinner',
    section_key,
    CASE section_key
        WHEN 'starters' THEN 'Starters'
        WHEN 'main-course' THEN 'Main Course'
        WHEN 'main-courses' THEN 'Main Courses'
        WHEN 'desserts' THEN 'Desserts'
        WHEN 'dessert' THEN 'Dessert'
        WHEN 'tea-or-coffee' THEN 'Tea or Coffee'
        WHEN 'specials' THEN 'Specials'
        ELSE INITCAP(REPLACE(section_key, '-', ' '))
    END as name,
    0 as display_order
FROM menu_items
WHERE menu_id = 'christmas-dinner'
ON CONFLICT DO NOTHING;

-- Step 5: Copy menu sections from Christmas Lunch to Kids Christmas Lunch
INSERT INTO menu_sections (menu_id, section_key, name, display_order)
SELECT DISTINCT
    'kids-christmas-lunch',
    section_key,
    CASE section_key
        WHEN 'starters' THEN 'Starters'
        WHEN 'main-course' THEN 'Main Course'
        WHEN 'main-courses' THEN 'Main Courses'
        WHEN 'desserts' THEN 'Desserts'
        WHEN 'dessert' THEN 'Dessert'
        WHEN 'tea-or-coffee' THEN 'Tea or Coffee'
        WHEN 'specials' THEN 'Specials'
        ELSE INITCAP(REPLACE(section_key, '-', ' '))
    END as name,
    0 as display_order
FROM menu_items
WHERE menu_id = 'christmas-lunch'
ON CONFLICT DO NOTHING;

-- Step 6: Copy all items from Christmas Dinner to Kids Christmas Dinner
-- Create unique IDs by prefixing with 'kids-cd-' (kids-christmas-dinner)
-- Starters and desserts keep original prices, main courses are £7.50
INSERT INTO menu_items (id, menu_id, section_key, name, description, price, comes_with_side, is_steak, created_at, updated_at)
SELECT 
    'kids-cd-' || id,  -- Unique ID prefix for kids-christmas-dinner
    'kids-christmas-dinner',
    section_key,
    name,
    description,
    CASE 
        WHEN LOWER(section_key) IN ('main-course', 'main-courses', 'mains') THEN 7.50  -- All main courses are £7.50
        ELSE price  -- Starters and desserts keep original price
    END as price,
    COALESCE(comes_with_side, false),
    COALESCE(is_steak, false),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM menu_items
WHERE menu_id = 'christmas-dinner'
ON CONFLICT (id) DO UPDATE SET
    menu_id = EXCLUDED.menu_id,
    section_key = EXCLUDED.section_key,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    comes_with_side = EXCLUDED.comes_with_side,
    is_steak = EXCLUDED.is_steak,
    updated_at = CURRENT_TIMESTAMP;

-- Step 7: Copy all items from Christmas Lunch to Kids Christmas Lunch
-- Create unique IDs by prefixing with 'kids-cl-' (kids-christmas-lunch)
-- Starters and desserts keep original prices, main courses are £7.50
INSERT INTO menu_items (id, menu_id, section_key, name, description, price, comes_with_side, is_steak, created_at, updated_at)
SELECT 
    'kids-cl-' || id,  -- Unique ID prefix for kids-christmas-lunch
    'kids-christmas-lunch',
    section_key,
    name,
    description,
    CASE 
        WHEN LOWER(section_key) IN ('main-course', 'main-courses', 'mains') THEN 7.50  -- All main courses are £7.50
        ELSE price  -- Starters and desserts keep original price
    END as price,
    COALESCE(comes_with_side, false),
    COALESCE(is_steak, false),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM menu_items
WHERE menu_id = 'christmas-lunch'
ON CONFLICT (id) DO UPDATE SET
    menu_id = EXCLUDED.menu_id,
    section_key = EXCLUDED.section_key,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    comes_with_side = EXCLUDED.comes_with_side,
    is_steak = EXCLUDED.is_steak,
    updated_at = CURRENT_TIMESTAMP;

-- Step 8: Verify the inserts
SELECT '✅ Kids Christmas menus created successfully!' AS status;

-- Step 9: Show menu sections created
SELECT '📋 Menu Sections Created:' AS info;
SELECT menu_id, section_key, name 
FROM menu_sections 
WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch')
ORDER BY menu_id, section_key;

-- Step 10: Show item counts
SELECT '📊 Item Counts:' AS info;
SELECT menu_id, COUNT(*) AS item_count 
FROM menu_items 
WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch')
GROUP BY menu_id;

-- Step 11: Show sample of main courses to verify pricing (should all be £7.50)
SELECT '🍽️ Main Courses (should all be £7.50):' AS info;
SELECT menu_id, section_key, name, price 
FROM menu_items 
WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch') 
  AND LOWER(section_key) IN ('main-course', 'main-courses', 'mains')
ORDER BY menu_id, name;

-- Step 12: Show sample of starters and desserts (should keep original prices)
SELECT '🍰 Starters and Desserts (original prices):' AS info;
SELECT menu_id, section_key, name, price 
FROM menu_items 
WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch') 
  AND LOWER(section_key) IN ('starters', 'desserts', 'dessert')
ORDER BY menu_id, section_key, name
LIMIT 10;

-- Step 13: Show ALL items by section
SELECT '📝 All Items by Section:' AS info;
SELECT menu_id, section_key, COUNT(*) as count, 
       MIN(price) as min_price, MAX(price) as max_price, AVG(price) as avg_price
FROM menu_items 
WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch')
GROUP BY menu_id, section_key
ORDER BY menu_id, section_key;

