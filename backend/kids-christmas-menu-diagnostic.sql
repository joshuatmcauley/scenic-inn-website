-- Diagnostic queries to check what exists in the database
-- Run these FIRST to see what we're working with

-- 1. Check if Christmas menus exist
SELECT 'Checking for Christmas menus...' AS info;
SELECT id, name FROM menus WHERE id LIKE '%christmas%' OR name ILIKE '%christmas%';

-- 2. Check what section keys exist for Christmas menus
SELECT 'Checking section keys for Christmas menus...' AS info;
SELECT DISTINCT menu_id, section_key 
FROM menu_items 
WHERE menu_id LIKE '%christmas%'
ORDER BY menu_id, section_key;

-- 3. Check how many items exist for Christmas menus
SELECT 'Checking item counts for Christmas menus...' AS info;
SELECT menu_id, section_key, COUNT(*) as item_count
FROM menu_items 
WHERE menu_id LIKE '%christmas%'
GROUP BY menu_id, section_key
ORDER BY menu_id, section_key;

-- 4. Show sample items from Christmas menus
SELECT 'Sample items from Christmas menus...' AS info;
SELECT menu_id, section_key, id, name, price
FROM menu_items 
WHERE menu_id LIKE '%christmas%'
ORDER BY menu_id, section_key, name
LIMIT 20;

-- 5. Check if kids Christmas menus already exist
SELECT 'Checking if kids Christmas menus exist...' AS info;
SELECT id, name FROM menus WHERE id IN ('kids-christmas-dinner', 'kids-christmas-lunch');

-- 6. Check if kids Christmas menu items exist
SELECT 'Checking if kids Christmas menu items exist...' AS info;
SELECT COUNT(*) as item_count, menu_id
FROM menu_items 
WHERE menu_id IN ('kids-christmas-dinner', 'kids-christmas-lunch')
GROUP BY menu_id;

