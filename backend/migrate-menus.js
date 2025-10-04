const { dbHelpers } = require('./database');

// Current menu data from the routes/menu.js file
const currentMenus = {
  'tea-time': {
    id: 'tea-time',
    name: 'Tea Time Menu',
    schedule: 'Served Monday - Thursday 5:00pm - 8:30pm',
    pricing: {
      '2-courses': 22.00,
      '3-courses': 25.00
    },
    sections: {
      'starters': {
        name: 'Starters',
        items: [
          {
            id: 'soup-day-tt',
            name: 'Soup Of The Day',
            description: 'Wheaten bread',
            price: 6.95
          },
          {
            id: 'salt-chilli-chicken',
            name: 'Salt N Chilli Chicken',
            description: 'Salad Garnish/Garlic Aioli',
            price: 8.95
          },
          {
            id: 'cheesy-bacon-garlic',
            name: 'Cheesy Bacon Garlic Bread',
            description: 'Salad Garnish/Garlic Aioli',
            price: 7.95
          },
          {
            id: 'veg-spring-rolls',
            name: 'Vegetable Spring Rolls',
            description: 'Salad Garnish/Chilli Dip',
            price: 7.50
          },
          {
            id: 'cheese-bbq-wedges',
            name: 'Cheese BBQ Wedges',
            description: 'Wedges/BBQ Sauce/Cheese/Bacon',
            price: 8.50
          },
          {
            id: 'franks-hot-wings',
            name: 'Franks Hot Chicken Wings',
            description: 'Franks Hot Sauce Butter',
            price: 9.95
          },
          {
            id: 'potato-bread-fries',
            name: 'Potato Bread Fries',
            description: 'Ketchup Dip',
            price: 6.50
          },
          {
            id: 'nachos',
            name: 'Nachos',
            description: 'BBQ Beef Brisket/Tortillas/Guacamole/Salsa/Jalapeños',
            price: 10.95
          }
        ]
      },
      'main-course': {
        name: 'Main Course',
        items: [
          {
            id: 'pan-seared-salmon-tt',
            name: 'Pan Seared Salmon',
            description: 'Champ/Asparagus/Lemon Butter Sauce',
            price: 19.95
          },
          {
            id: 'sirloin-steak-tt',
            name: '8oz Sirloin Steak',
            description: 'Tobacco Onions/Pepper Sauce/Chips',
            price: 24.95
          },
          {
            id: 'chicken-curry-tt',
            name: 'Chicken Curry',
            description: 'Basmati Rice/Naan Bread',
            price: 17.50
          }
        ]
      }
    }
  },
  'weekend-evening': {
    id: 'weekend-evening',
    name: 'Weekend Evening Menu',
    schedule: 'Served Friday - Sunday 5:00pm - 9:00pm',
    sections: {
      'starters': {
        name: 'Starters',
        items: [
          {
            id: 'soup-day-we',
            name: 'Soup Of The Day',
            description: 'Wheaten Bread',
            price: 7.50
          },
          {
            id: 'cheesy-garlic-bread',
            name: 'Cheesy Garlic Bread',
            description: 'Salad Garnish/Garlic Mayo',
            price: 6.95
          },
          {
            id: 'garlic-mushroom',
            name: 'Garlic Mushroom',
            description: 'Breaded Mushroom/Salad Garnish/Garlic Mayo',
            price: 7.95
          },
          {
            id: 'chinese-chicken-strippers',
            name: 'Chinese Chicken Strippers',
            description: 'Battered Chicken Strips In Chinese Glaze/Salad Garnish/BBQ Mayo',
            price: 8.50
          }
        ]
      },
      'main-course': {
        name: 'Main Course',
        items: [
          {
            id: 'pan-seared-salmon-we',
            name: 'Pan Seared Salmon',
            description: 'Champ/Asparagus/Lemon Butter Sauce',
            price: 19.95
          },
          {
            id: 'sirloin-steak-we',
            name: '8oz Sirloin Steak',
            description: 'Tobacco Onions/Pepper Sauce/Chips',
            price: 24.95
          },
          {
            id: 'chicken-curry-we',
            name: 'Chicken Curry',
            description: 'Basmati Rice/Naan Bread',
            price: 17.50
          }
        ]
      }
    }
  },
  'sunday-lunch': {
    id: 'sunday-lunch',
    name: 'Sunday Lunch Menu',
    schedule: 'Served Sunday 12:00pm - 5:00pm',
    pricing: {
      '1-course': 16.95,
      '2-courses': 20.95,
      '3-courses': 24.95
    },
    sections: {
      'starters': {
        name: 'Starters',
        items: [
          {
            id: 'soup-day-sl',
            name: 'Soup Of The Day',
            description: 'Wheaten Bread',
            price: 6.95
          },
          {
            id: 'garlic-mushrooms-sl',
            name: 'Garlic Mushrooms',
            description: 'Breaded Mushrooms/Salad Garnish/Garlic Mayo',
            price: 7.50
          },
          {
            id: 'prawn-cocktail-sl',
            name: 'Prawn Cocktail',
            description: 'Prawns/Salad/Marie Rose Sauce/Wheaten Bread',
            price: 8.95
          },
          {
            id: 'chicken-strippers-sl',
            name: 'Chicken Strippers',
            description: 'Chinese Seasoned Battered Chicken/Salad Garnish/Dip',
            price: 7.95
          },
          {
            id: 'egg-mayo-sl',
            name: 'Egg Mayo',
            description: 'Salad/Paprika',
            price: 6.50
          }
        ]
      },
      'main-course': {
        name: 'Main Course',
        items: [
          {
            id: 'turkey-ham-stuffing',
            name: 'Traditional Turkey, Ham, Stuffing',
            description: 'Mash/Roast Potato/Chefs Vegetables/Sauce',
            price: 16.95
          },
          {
            id: 'roast-beef-yorkshire',
            name: 'Roast Beef And Yorkshire Pudding',
            description: 'Mash/Roast Potato/Chefs Vegetables/Gravy',
            price: 18.95
          },
          {
            id: 'gammon-pineapple',
            name: 'Gammon And Pineapple',
            description: 'Chips/Peas',
            price: 15.95
          },
          {
            id: 'chicken-escalope-sl',
            name: 'Pan Fried Chicken Escalope',
            description: 'Creamy Pepper Sauce/Chips/Salad',
            price: 16.50
          }
        ]
      },
      'desserts': {
        name: 'Desserts',
        items: [
          {
            id: 'brownie-sundae',
            name: 'Brownie Sundae',
            description: 'Warm Chocolate Brownie/Ice Cream/Chocolate Sauce',
            price: 6.95
          },
          {
            id: 'apple-crumble',
            name: 'Apple Crumble And Custard',
            description: 'Homemade Apple Crumble/Custard',
            price: 6.50
          },
          {
            id: 'chefs-cheesecake',
            name: 'Chefs Cheesecake',
            description: 'Ask server for today\'s flavour',
            price: 6.95
          }
        ]
      }
    }
  },
  'lunch': {
    id: 'lunch',
    name: 'Lunch Menu',
    schedule: 'Served Monday - Saturday 12:00pm - 4:45pm',
    sections: {
      'light-bites': {
        name: 'Light Bites',
        items: [
          {
            id: 'club-sandwich',
            name: 'Club Sandwich',
            description: 'Chicken, bacon, and avocado on toasted bread',
            price: 9.95
          },
          {
            id: 'quiche-lorraine',
            name: 'Quiche Lorraine',
            description: 'Traditional quiche with side salad',
            price: 8.95
          },
          {
            id: 'soup-day-lunch',
            name: 'Soup of the Day',
            description: 'Chef\'s daily selection with bread roll',
            price: 6.95
          }
        ]
      },
      'main-courses': {
        name: 'Main Courses',
        items: [
          {
            id: 'beef-burger',
            name: 'Beef Burger',
            description: '8oz beef patty with chips and coleslaw',
            price: 12.95
          },
          {
            id: 'pasta-carbonara',
            name: 'Pasta Carbonara',
            description: 'Creamy bacon and egg pasta',
            price: 11.95
          },
          {
            id: 'fish-chips',
            name: 'Fish and Chips',
            description: 'Beer battered cod with mushy peas',
            price: 13.95
          }
        ]
      }
    }
  }
};

async function migrateMenus() {
  try {
    console.log('🔄 Starting menu migration...');
    
    for (const [menuId, menuData] of Object.entries(currentMenus)) {
      try {
        await dbHelpers.createMenu(menuData);
        console.log(`✅ Migrated menu: ${menuData.name}`);
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          console.log(`⚠️  Menu already exists: ${menuData.name}`);
        } else {
          console.error(`❌ Failed to migrate menu ${menuData.name}:`, error.message);
        }
      }
    }
    
    console.log('🎉 Menu migration completed!');
    
    // Display all menus in database
    const allMenus = await dbHelpers.getAllMenus();
    console.log(`\n📊 Total menus in database: ${allMenus.length}`);
    allMenus.forEach(menu => {
      console.log(`   - ${menu.name} (${menu.id})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateMenus().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  });
}

module.exports = { migrateMenus, currentMenus };
