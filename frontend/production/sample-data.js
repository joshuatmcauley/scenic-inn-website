// Sample data for The Scenic Inn booking system
// This file provides mock data for development and fallback scenarios

// Time slots available by day of the week
const TIME_SLOTS_BY_DAY = {
    monday: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'],
    tuesday: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'],
    wednesday: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'],
    thursday: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'],
    friday: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'],
    saturday: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'],
    sunday: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']
};

// Sample available slots (fallback)
const SAMPLE_AVAILABLE_SLOTS = [
    { time: '12:00', available: true },
    { time: '12:30', available: true },
    { time: '13:00', available: true },
    { time: '13:30', available: true },
    { time: '14:00', available: true },
    { time: '14:30', available: true },
    { time: '15:00', available: true },
    { time: '15:30', available: true },
    { time: '16:00', available: true },
    { time: '16:30', available: true },
    { time: '17:00', available: true },
    { time: '17:30', available: true },
    { time: '18:00', available: true },
    { time: '18:30', available: true },
    { time: '19:00', available: true },
    { time: '19:30', available: true },
    { time: '20:00', available: true },
    { time: '20:30', available: true }
];

// Sample menu data - this will be replaced by database data
const SAMPLE_MENU_DATA = {
    'tea-time': {
        name: 'Tea Time Menu',
        description: 'Served Monday - Thursday 5:00pm - 8:30pm. 2 courses £22, 3 courses £25',
        categories: [
            {
                name: 'Starters',
                items: [
                    { id: 'soup-day', name: 'Soup Of The Day', description: 'Wheaten Bread', price: '£7.50' },
                    { id: 'bang-bang-chicken', name: 'Bang Bang Chicken', description: 'Satay Skewers/Bang Bang Asian Veg', price: '£12.95' },
                    { id: 'chicken-goujons', name: 'Chicken Goujons', description: 'Panko Breadcrumbs/Salad Garnish/Dip', price: '£11.95' }
                ]
            },
            {
                name: 'Main Course',
                items: [
                    { id: 'sizzling-pepper-beef', name: 'Sizzling Pepper Beef', description: 'Beef Strips/Peppers/Mushrooms', price: '£18.95' },
                    { id: 'chicken-stack', name: 'Chicken Stack', description: '2 Sausages/2 Bacon/Beans/Egg/Chips', price: '£16.95' },
                    { id: 'house-chicken-curry', name: 'House Chicken Curry', description: 'Saffron Rice/Naan', price: '£15.95' },
                    { id: 'steak-sandwich', name: 'Steak Sandwich', description: 'Peas/Garnish', price: '£17.95' },
                    { id: 'braised-beef', name: 'Braised Beef', description: 'Mashed Potato/Veg', price: '£19.95' }
                ]
            },
            {
                name: 'Side Orders',
                items: [
                    { id: 'triple-cooked-chips', name: 'Triple Cooked Chips', description: '', price: '£4.50' },
                    { id: 'garlic-chips', name: 'Garlic Chips', description: '', price: '£5.50' },
                    { id: 'chilli-sour-cream-chips', name: 'Chilli & Sour Cream Chips', description: '', price: '£6.50' },
                    { id: 'skinny-fries', name: 'Skinny Fries', description: '', price: '£4.00' },
                    { id: 'champ', name: 'Champ', description: '', price: '£4.50' },
                    { id: 'sweet-potato-fries', name: 'Sweet Potato Fries', description: '', price: '£5.00' },
                    { id: 'salad', name: 'Salad', description: '', price: '£3.50' }
                ]
            },
            {
                name: 'Desserts',
                items: [
                    { id: 'sticky-toffee-pudding', name: 'Sticky Toffee Pudding', description: 'Vanilla Ice Cream', price: '£6.95' },
                    { id: 'chocolate-brownie', name: 'Chocolate Brownie', description: 'Warm with Ice Cream', price: '£6.95' },
                    { id: 'apple-crumble', name: 'Apple Crumble', description: 'Custard or Ice Cream', price: '£6.50' }
                ]
            }
        ]
    },
    'weekend': {
        name: 'Weekend Evening Menu',
        description: 'Served Friday - Sunday 5:00pm - 9:00pm. No fixed price',
        categories: [
            {
                name: 'Starters',
                items: [
                    { id: 'soup-day', name: 'Soup Of The Day', description: 'Wheaten Bread', price: '£7.50' },
                    { id: 'bang-bang-chicken', name: 'Bang Bang Chicken', description: 'Satay Skewers/Bang Bang Asian Veg', price: '£12.95' },
                    { id: 'chicken-goujons', name: 'Chicken Goujons', description: 'Panko Breadcrumbs/Salad Garnish/Dip', price: '£11.95' }
                ]
            },
            {
                name: 'Main Course',
                items: [
                    { id: 'sizzling-pepper-beef', name: 'Sizzling Pepper Beef', description: 'Beef Strips/Peppers/Mushrooms', price: '£18.95' },
                    { id: 'chicken-stack', name: 'Chicken Stack', description: '2 Sausages/2 Bacon/Beans/Egg/Chips', price: '£16.95' },
                    { id: 'house-chicken-curry', name: 'House Chicken Curry', description: 'Saffron Rice/Naan', price: '£15.95' },
                    { id: 'steak-sandwich', name: 'Steak Sandwich', description: 'Peas/Garnish', price: '£17.95' },
                    { id: 'braised-beef', name: 'Braised Beef', description: 'Mashed Potato/Veg', price: '£19.95' }
                ]
            },
            {
                name: 'Side Orders',
                items: [
                    { id: 'triple-cooked-chips', name: 'Triple Cooked Chips', description: '', price: '£4.50' },
                    { id: 'garlic-chips', name: 'Garlic Chips', description: '', price: '£5.50' },
                    { id: 'chilli-sour-cream-chips', name: 'Chilli & Sour Cream Chips', description: '', price: '£6.50' },
                    { id: 'skinny-fries', name: 'Skinny Fries', description: '', price: '£4.00' },
                    { id: 'champ', name: 'Champ', description: '', price: '£4.50' },
                    { id: 'sweet-potato-fries', name: 'Sweet Potato Fries', description: '', price: '£5.00' },
                    { id: 'salad', name: 'Salad', description: '', price: '£3.50' }
                ]
            },
            {
                name: 'Desserts',
                items: [
                    { id: 'sticky-toffee-pudding', name: 'Sticky Toffee Pudding', description: 'Vanilla Ice Cream', price: '£6.95' },
                    { id: 'chocolate-brownie', name: 'Chocolate Brownie', description: 'Warm with Ice Cream', price: '£6.95' },
                    { id: 'apple-crumble', name: 'Apple Crumble', description: 'Custard or Ice Cream', price: '£6.50' }
                ]
            }
        ]
    },
    'sunday': {
        name: 'Sunday Lunch Menu',
        description: 'Served Sunday 12:00pm - 5:00pm. 1 course: £16.95, 2 course: £20.95, 3 Course £24.95',
        categories: [
            {
                name: 'Starters',
                items: [
                    { id: 'soup-day', name: 'Soup Of The Day', description: 'Wheaten Bread', price: '£7.50' },
                    { id: 'bang-bang-chicken', name: 'Bang Bang Chicken', description: 'Satay Skewers/Bang Bang Asian Veg', price: '£12.95' },
                    { id: 'chicken-goujons', name: 'Chicken Goujons', description: 'Panko Breadcrumbs/Salad Garnish/Dip', price: '£11.95' }
                ]
            },
            {
                name: 'Main Course',
                items: [
                    { id: 'sunday-roast-beef', name: 'Sunday Roast Beef', description: 'Yorkshire Pudding/Roast Potatoes/Veg/Gravy', price: '£18.95' },
                    { id: 'sunday-roast-chicken', name: 'Sunday Roast Chicken', description: 'Yorkshire Pudding/Roast Potatoes/Veg/Gravy', price: '£16.95' },
                    { id: 'sunday-roast-lamb', name: 'Sunday Roast Lamb', description: 'Yorkshire Pudding/Roast Potatoes/Veg/Gravy', price: '£19.95' },
                    { id: 'sunday-roast-pork', name: 'Sunday Roast Pork', description: 'Yorkshire Pudding/Roast Potatoes/Veg/Gravy', price: '£17.95' }
                ]
            },
            {
                name: 'Side Orders',
                items: [
                    { id: 'triple-cooked-chips', name: 'Triple Cooked Chips', description: '', price: '£4.50' },
                    { id: 'garlic-chips', name: 'Garlic Chips', description: '', price: '£5.50' },
                    { id: 'chilli-sour-cream-chips', name: 'Chilli & Sour Cream Chips', description: '', price: '£6.50' },
                    { id: 'skinny-fries', name: 'Skinny Fries', description: '', price: '£4.00' },
                    { id: 'champ', name: 'Champ', description: '', price: '£4.50' },
                    { id: 'sweet-potato-fries', name: 'Sweet Potato Fries', description: '', price: '£5.00' },
                    { id: 'salad', name: 'Salad', description: '', price: '£3.50' }
                ]
            },
            {
                name: 'Desserts',
                items: [
                    { id: 'sticky-toffee-pudding', name: 'Sticky Toffee Pudding', description: 'Vanilla Ice Cream', price: '£6.95' },
                    { id: 'chocolate-brownie', name: 'Chocolate Brownie', description: 'Warm with Ice Cream', price: '£6.95' },
                    { id: 'apple-crumble', name: 'Apple Crumble', description: 'Custard or Ice Cream', price: '£6.50' },
                    { id: 'sunday-trifle', name: 'Sunday Trifle', description: 'Traditional English Trifle', price: '£6.95' }
                ]
            }
        ]
    },
    'lunch': {
        name: 'Lunch Menu',
        description: 'Served Monday - Saturday 12:00pm - 4:45pm. No fixed price',
        categories: [
            {
                name: 'Light Bites',
                items: [
                    { id: 'soup-day', name: 'Soup Of The Day', description: 'Wheaten Bread', price: '£7.50' },
                    { id: 'chicken-goujons', name: 'Chicken Goujons', description: 'Panko Breadcrumbs/Salad Garnish/Dip', price: '£11.95' },
                    { id: 'nachos', name: 'Nachos', description: 'BBQ Beef Brisket/Tortillas', price: '£15.99' }
                ]
            },
            {
                name: 'Main Courses',
                items: [
                    { id: 'chicken-stack', name: 'Chicken Stack', description: '2 Sausages/2 Bacon/Beans/Egg/Chips', price: '£16.95' },
                    { id: 'house-chicken-curry', name: 'House Chicken Curry', description: 'Saffron Rice/Naan', price: '£15.95' },
                    { id: 'steak-sandwich', name: 'Steak Sandwich', description: 'Peas/Garnish', price: '£17.95' },
                    { id: 'braised-beef', name: 'Braised Beef', description: 'Mashed Potato/Veg', price: '£19.95' }
                ]
            },
            {
                name: 'Loaded Fries',
                items: [
                    { id: 'loaded-beef-fries', name: 'Loaded Beef Fries', description: 'Beef Brisket/Cheese/Sour Cream', price: '£12.95' },
                    { id: 'loaded-chicken-fries', name: 'Loaded Chicken Fries', description: 'Chicken/Cheese/Bacon', price: '£11.95' }
                ]
            },
            {
                name: 'Burgers',
                items: [
                    { id: 'scenic-burger', name: 'Scenic Burger', description: 'Beef Patty/Lettuce/Tomato/Onion', price: '£14.95' },
                    { id: 'chicken-burger', name: 'Chicken Burger', description: 'Buttermilk Chicken/Lettuce/Tomato/Mayo', price: '£13.95' }
                ]
            },
            {
                name: 'Sides',
                items: [
                    { id: 'triple-cooked-chips', name: 'Triple Cooked Chips', description: '', price: '£4.50' },
                    { id: 'garlic-chips', name: 'Garlic Chips', description: '', price: '£5.50' },
                    { id: 'chilli-sour-cream-chips', name: 'Chilli & Sour Cream Chips', description: '', price: '£6.50' },
                    { id: 'skinny-fries', name: 'Skinny Fries', description: '', price: '£4.00' },
                    { id: 'champ', name: 'Champ', description: '', price: '£4.50' },
                    { id: 'sweet-potato-fries', name: 'Sweet Potato Fries', description: '', price: '£5.00' },
                    { id: 'salad', name: 'Salad', description: '', price: '£3.50' }
                ]
            }
        ]
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TIME_SLOTS_BY_DAY,
        SAMPLE_AVAILABLE_SLOTS,
        SAMPLE_MENU_DATA
    };
}
