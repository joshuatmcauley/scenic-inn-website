-- Kids Christmas Menu Insert Script (FIXED)
-- Creates separate kids versions of Christmas Dinner and Christmas Lunch menus
-- ONLY main courses are included, all priced at £7.50
-- Run this in DBeaver or your PostgreSQL client

-- Step 1: Delete ALL existing kids Christmas menu items and sections first
DELETE FROM menu_items WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch');
DELETE FROM menu_sections WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch');

-- Step 2: Create Kids Christmas Dinner Menu
INSERT INTO menus (id, name, schedule, pricing, created_at, updated_at)
VALUES (
    'kids-christmas-dinner',
    'Kids Christmas Dinner Menu',
    'Available for children - main courses only, all priced at £7.50',
    '{"pricing_type": "individual"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    schedule = EXCLUDED.schedule,
    pricing = EXCLUDED.pricing,
    updated_at = CURRENT_TIMESTAMP;

-- Step 3: Create Kids Christmas Lunch Menu
INSERT INTO menus (id, name, schedule, pricing, created_at, updated_at)
VALUES (
    'kids-christmas-lunch',
    'Kids Christmas Lunch Menu',
    'Available for children - main courses only, all priced at £7.50',
    '{"pricing_type": "individual"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    schedule = EXCLUDED.schedule,
    pricing = EXCLUDED.pricing,
    updated_at = CURRENT_TIMESTAMP;

-- Step 4: Create menu section for main courses in Kids Christmas Dinner
INSERT INTO menu_sections (menu_id, section_key, name)
VALUES (
    'kids-christmas-dinner',
    'main-course',
    'Main Course'
)
ON CONFLICT DO NOTHING;

-- Step 5: Create menu section for main courses in Kids Christmas Lunch
INSERT INTO menu_sections (menu_id, section_key, name)
VALUES (
    'kids-christmas-lunch',
    'main-course',
    'Main Course'
)
ON CONFLICT DO NOTHING;

-- Step 6: Copy ONLY main courses from Christmas Dinner to Kids Christmas Dinner
-- All main courses are priced at £7.50
INSERT INTO menu_items (id, menu_id, section_key, name, description, price, comes_with_side, is_steak, created_at, updated_at)
SELECT 
    'kids-cd-' || id,  -- Unique ID prefix for kids-christmas-dinner
    'kids-christmas-dinner',
    'main-course',  -- Always use 'main-course' as section_key
    name,
    description,
    7.50,  -- ALL main courses are £7.50
    COALESCE(comes_with_side, false),
    COALESCE(is_steak, false),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM menu_items
WHERE menu_id = 'christmas-dinner'
  AND LOWER(section_key) IN ('main-course', 'main-courses', 'mains')  -- Only copy main courses
ON CONFLICT (id) DO UPDATE SET
    menu_id = EXCLUDED.menu_id,
    section_key = EXCLUDED.section_key,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    comes_with_side = EXCLUDED.comes_with_side,
    is_steak = EXCLUDED.is_steak,
    updated_at = CURRENT_TIMESTAMP;

-- Step 7: Copy ONLY main courses from Christmas Lunch to Kids Christmas Lunch
-- All main courses are priced at £7.50
INSERT INTO menu_items (id, menu_id, section_key, name, description, price, comes_with_side, is_steak, created_at, updated_at)
SELECT 
    'kids-cl-' || id,  -- Unique ID prefix for kids-christmas-lunch
    'kids-christmas-lunch',
    'main-course',  -- Always use 'main-course' as section_key
    name,
    description,
    7.50,  -- ALL main courses are £7.50
    COALESCE(comes_with_side, false),
    COALESCE(is_steak, false),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM menu_items
WHERE menu_id = 'christmas-lunch'
  AND LOWER(section_key) IN ('main-course', 'main-courses', 'mains')  -- Only copy main courses
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

-- Step 11: Show ALL main courses (should all be £7.50)
SELECT '🍽️ Main Courses (should ALL be £7.50):' AS info;
SELECT menu_id, section_key, name, description, price 
FROM menu_items 
WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch')
ORDER BY menu_id, name;

-- Step 12: Verify no other sections were copied
SELECT '🔍 Verification - Other Sections (should be empty):' AS info;
SELECT menu_id, section_key, COUNT(*) as count
FROM menu_items 
WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch')
  AND LOWER(section_key) NOT IN ('main-course', 'main-courses', 'mains')
GROUP BY menu_id, section_key;
