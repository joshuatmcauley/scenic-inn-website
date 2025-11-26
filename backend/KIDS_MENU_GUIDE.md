# Kids Menu Setup Guide

## Step 1: Run the SQL Script

1. Open DBeaver (or your PostgreSQL client)
2. Connect to your Railway database
3. Open the SQL script: `01-website/backend/kids-menu-insert.sql`
4. Execute the script (F5 or Run button)

This will:
- Create a menu with ID `kids-menu`
- Add 8 sample kids menu items:
  - 5 main courses (Chicken Nuggets, Fish Fingers, Pasta, Mini Burger, Sausage & Mash)
  - 2 sides (Chips, Vegetables)
  - 1 dessert (Ice Cream)

## Step 2: Verify the Insert

After running the script, verify it worked:

```sql
-- Check the menu was created
SELECT * FROM menus WHERE id = 'kids-menu';

-- Check all kids menu items
SELECT * FROM menu_items WHERE menu_id = 'kids-menu';
```

You should see:
- 1 menu row
- 8 menu item rows

## Step 3: Update Menu Items (Optional)

You can update the sample items with actual kids menu items later:

```sql
UPDATE menu_items 
SET name = 'Your Item Name', 
    description = 'Item description',
    price = 6.95
WHERE id = 'kids-item-1';
```

## Step 4: Test the Functionality

1. Go to the booking page
2. Select adults and children (e.g., 2 adults, 1 child)
3. Enable preorder for a party of 11+
4. You should see:
   - Adults get the regular menu
   - Children get the kids menu (with 🧒 icon)
   - Kids menu items are simpler (main + dessert, no starters)

## Menu Structure

The kids menu uses:
- **section_key**: `main-course`, `sides`, `desserts`
- **pricing_type**: `individual` (each item priced separately)
- **No starters** (kids menu typically doesn't have starters)

## Adding More Items

To add more kids menu items, use this format:

```sql
INSERT INTO menu_items (id, menu_id, section_key, name, description, price, comes_with_side, is_steak, created_at, updated_at)
VALUES (
    'kids-item-9',  -- Unique ID
    'kids-menu',    -- Menu ID
    'main-course',  -- Section: main-course, sides, or desserts
    'Item Name',    -- Display name
    'Description',  -- Optional description
    6.95,           -- Price
    true,           -- comes_with_side (true/false)
    false,          -- is_steak (always false for kids)
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
```

## Notes

- Kids menu is always available (not time/date restricted)
- Children are identified by `is_child: true` in preorder data
- Kids menu items are marked with `is_kids_menu: true` in the preorder
- The frontend automatically loads kids menu when children are in the party

