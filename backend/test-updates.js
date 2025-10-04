const { dbHelpers } = require('./database');

// Test script to demonstrate real-time database updates
async function testRealTimeUpdates() {
    console.log('🔄 Testing real-time database updates...\n');
    
    try {
        // 1. Show current menus
        console.log('📋 Current menus in database:');
        const currentMenus = await dbHelpers.getAllMenus();
        currentMenus.forEach(menu => {
            console.log(`   - ${menu.name} (${menu.id})`);
        });
        
        // 2. Add a new test item to Tea Time Menu
        console.log('\n➕ Adding new item to Tea Time Menu...');
        const teaTimeMenu = await dbHelpers.getMenuById('tea-time');
        if (teaTimeMenu) {
            const newItem = {
                id: `test-item-${Date.now()}`,
                name: 'Test Special Item',
                description: 'This is a test item added via database',
                price: 15.99
            };
            
            // Add to starters section
            if (!teaTimeMenu.sections.starters) {
                teaTimeMenu.sections.starters = { name: 'Starters', items: [] };
            }
            teaTimeMenu.sections.starters.items.push(newItem);
            
            await dbHelpers.updateMenu('tea-time', teaTimeMenu);
            console.log('✅ New item added successfully!');
        }
        
        // 3. Show updated menu
        console.log('\n📋 Updated Tea Time Menu:');
        const updatedMenu = await dbHelpers.getMenuById('tea-time');
        if (updatedMenu && updatedMenu.sections.starters) {
            console.log('   Starters:');
            updatedMenu.sections.starters.items.forEach(item => {
                console.log(`     - ${item.name}: £${item.price.toFixed(2)}`);
            });
        }
        
        // 4. Update pricing for Sunday Lunch Menu
        console.log('\n💰 Updating Sunday Lunch Menu pricing...');
        const sundayMenu = await dbHelpers.getMenuById('sunday-lunch');
        if (sundayMenu) {
            sundayMenu.pricing = {
                '1-course': 18.95,
                '2-courses': 22.95,
                '3-courses': 26.95
            };
            await dbHelpers.updateMenu('sunday-lunch', sundayMenu);
            console.log('✅ Pricing updated successfully!');
            console.log('   New pricing:');
            Object.entries(sundayMenu.pricing).forEach(([key, price]) => {
                console.log(`     - ${key}: £${price.toFixed(2)}`);
            });
        }
        
        console.log('\n🎉 Real-time update test completed!');
        console.log('\n📱 Now check your pages:');
        console.log('   - Visitor Menu: http://localhost:3001/../frontend/menus-dynamic.html');
        console.log('   - Admin Dashboard: http://localhost:3001/../frontend/admin-menu-dashboard.html');
        console.log('   - API Endpoint: http://localhost:3001/api/menu');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testRealTimeUpdates().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Test error:', error);
        process.exit(1);
    });
}

module.exports = { testRealTimeUpdates };
