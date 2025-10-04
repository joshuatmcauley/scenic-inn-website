// Sample data for The Scenic Inn booking system
// This will be replaced with real Dojo API data once credentials are set up

const SAMPLE_EXPERIENCES = [
    { id: 'lunch', name: 'Lunch Menu', price: '£12.95' },
    { id: 'tea-time', name: 'Tea Time Menu', price: '£22.00' },
    { id: 'weekend', name: 'Weekend Evening Menu', price: '£25.00' },
    { id: 'sunday', name: 'Sunday Lunch Menu', price: '£18.95' }
];

const SAMPLE_AVAILABLE_SLOTS = [
    { time: '12:00' },
    { time: '12:30' },
    { time: '13:00' },
    { time: '13:30' },
    { time: '14:00' },
    { time: '14:30' },
    { time: '15:00' },
    { time: '15:30' },
    { time: '16:00' },
    { time: '16:30' },
    { time: '17:00' },
    { time: '17:30' },
    { time: '18:00' },
    { time: '18:30' },
    { time: '19:00' },
    { time: '19:30' },
    { time: '20:00' },
    { time: '20:30' },
    { time: '21:00' }
];

// Time slots for different days based on menu schedule
const TIME_SLOTS_BY_DAY = {
    'monday': [
        // Lunch Menu: 12pm-4:45pm
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
        // Tea Time Menu: 5pm-8:30pm
        '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
    ],
    'tuesday': [
        // Lunch Menu: 12pm-4:45pm
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
        // Tea Time Menu: 5pm-8:30pm
        '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
    ],
    'wednesday': [
        // Lunch Menu: 12pm-4:45pm
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
        // Tea Time Menu: 5pm-8:30pm
        '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
    ],
    'thursday': [
        // Lunch Menu: 12pm-4:45pm
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
        // Tea Time Menu: 5pm-8:30pm
        '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
    ],
    'friday': [
        // Lunch Menu: 12pm-4:45pm
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
        // Weekend Evening Menu: 5pm-9pm
        '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
    ],
    'saturday': [
        // Lunch Menu: 12pm-4:45pm
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
        // Weekend Evening Menu: 5pm-9pm
        '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
    ],
    'sunday': [
        // Sunday Lunch Menu: 12pm-5pm
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
        // Weekend Evening Menu: 5pm-9pm
        '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
    ]
};

const SAMPLE_MENU_DATA = {
    'lunch': {
        name: 'Lunch Menu',
        description: 'Served Monday - Saturday, 12:00pm - 4:45pm',
        categories: [
            {
                name: 'Light Bites',
                items: [
                    { id: 'l-sandwich', name: 'Club Sandwich', price: '£9.95', description: 'Chicken, bacon, and avocado on toasted bread' },
                    { id: 'l-quiche', name: 'Quiche Lorraine', price: '£8.95', description: 'Traditional quiche with side salad' },
                    { id: 'l-soup', name: 'Soup of the Day', price: '£6.95', description: 'Chef\'s daily selection with bread roll' },
                    { id: 'l-panini', name: 'Chicken & Pesto Panini', price: '£8.95', description: 'Grilled chicken with fresh pesto' }
                ]
            },
            {
                name: 'Main Courses',
                items: [
                    { id: 'l-burger', name: 'Beef Burger', price: '£12.95', description: '8oz beef patty with chips and coleslaw' },
                    { id: 'l-pasta', name: 'Pasta Carbonara', price: '£11.95', description: 'Creamy bacon and egg pasta' },
                    { id: 'l-fish', name: 'Fish & Chips', price: '£13.95', description: 'Beer-battered cod with mushy peas' },
                    { id: 'l-salad', name: 'Caesar Salad', price: '£10.95', description: 'Romaine lettuce with parmesan and croutons' }
                ]
            },
            {
                name: 'Desserts',
                items: [
                    { id: 'l-ice-cream', name: 'Ice Cream Sundae', price: '£5.95', description: 'Three scoops with chocolate sauce' },
                    { id: 'l-brownie', name: 'Chocolate Brownie', price: '£5.95', description: 'Warm brownie with vanilla ice cream' },
                    { id: 'l-cheesecake', name: 'Strawberry Cheesecake', price: '£6.95', description: 'New York style with fresh strawberries' }
                ]
            }
        ]
    },
    'tea-time': {
        name: 'Tea Time Menu',
        description: 'Served Monday - Thursday, 5:00pm - 8:30pm',
        categories: [
            {
                name: 'Starters',
                items: [
                    { id: 'tt-soup', name: 'Soup of the Day', price: '£6.95', description: 'Chef\'s daily selection with artisan bread' },
                    { id: 'tt-pate', name: 'Chicken Liver Pâté', price: '£7.95', description: 'Served with toast and red onion chutney' },
                    { id: 'tt-prawns', name: 'Prawn Cocktail', price: '£8.95', description: 'Classic prawn cocktail with Marie Rose sauce' },
                    { id: 'tt-bruschetta', name: 'Tomato Bruschetta', price: '£6.95', description: 'Fresh tomatoes and basil on toasted ciabatta' }
                ]
            },
            {
                name: 'Main Courses',
                items: [
                    { id: 'tt-fish', name: 'Pan-fried Sea Bass', price: '£18.95', description: 'With seasonal vegetables and lemon butter' },
                    { id: 'tt-chicken', name: 'Roast Chicken Breast', price: '£16.95', description: 'With herb stuffing and gravy' },
                    { id: 'tt-lamb', name: 'Rack of Lamb', price: '£22.95', description: 'With rosemary jus and dauphinoise potatoes' },
                    { id: 'tt-vegetarian', name: 'Vegetarian Wellington', price: '£15.95', description: 'Mushroom and spinach in puff pastry' }
                ]
            },
            {
                name: 'Desserts',
                items: [
                    { id: 'tt-trifle', name: 'Traditional Trifle', price: '£6.95', description: 'Homemade with fresh cream and sherry' },
                    { id: 'tt-crumble', name: 'Apple Crumble', price: '£6.95', description: 'Served with warm custard' },
                    { id: 'tt-tart', name: 'Lemon Tart', price: '£7.95', description: 'With crème fraîche and berries' },
                    { id: 'tt-chocolate', name: 'Chocolate Fondant', price: '£7.95', description: 'Warm chocolate cake with vanilla ice cream' }
                ]
            }
        ]
    },
    'weekend': {
        name: 'Weekend Evening Menu',
        description: 'Served Friday - Sunday, 5:00pm - 9:00pm',
        categories: [
            {
                name: 'Starters',
                items: [
                    { id: 'we-prawns', name: 'Prawn Cocktail', price: '£8.95', description: 'Classic with Marie Rose sauce and avocado' },
                    { id: 'we-bruschetta', name: 'Bruschetta', price: '£7.95', description: 'Tomato and basil on toasted bread' },
                    { id: 'we-scallops', name: 'Pan-seared Scallops', price: '£12.95', description: 'With pea purée and pancetta' },
                    { id: 'we-calamari', name: 'Calamari Fritti', price: '£9.95', description: 'Crispy squid with garlic aioli' }
                ]
            },
            {
                name: 'Main Courses',
                items: [
                    { id: 'we-steak', name: 'Ribeye Steak', price: '£24.95', description: '10oz with chips and peppercorn sauce' },
                    { id: 'we-salmon', name: 'Grilled Salmon', price: '£19.95', description: 'With lemon butter sauce and vegetables' },
                    { id: 'we-duck', name: 'Duck Breast', price: '£22.95', description: 'With cherry sauce and fondant potato' },
                    { id: 'we-risotto', name: 'Wild Mushroom Risotto', price: '£16.95', description: 'Creamy risotto with truffle oil' }
                ]
            },
            {
                name: 'Desserts',
                items: [
                    { id: 'we-chocolate', name: 'Chocolate Fudge Cake', price: '£7.95', description: 'Warm with vanilla ice cream' },
                    { id: 'we-cheesecake', name: 'New York Cheesecake', price: '£6.95', description: 'With berry compote' },
                    { id: 'we-tiramisu', name: 'Tiramisu', price: '£7.95', description: 'Classic Italian dessert' },
                    { id: 'we-crème', name: 'Crème Brûlée', price: '£6.95', description: 'Vanilla custard with caramelized sugar' }
                ]
            }
        ]
    },
    'sunday': {
        name: 'Sunday Lunch Menu',
        description: 'Served Sunday, 12:00pm - 5:00pm',
        categories: [
            {
                name: 'Starters',
                items: [
                    { id: 'sl-pate', name: 'Duck Liver Pâté', price: '£7.95', description: 'With brioche and red onion chutney' },
                    { id: 'sl-soup', name: 'Roasted Tomato Soup', price: '£6.95', description: 'With fresh basil and croutons' },
                    { id: 'sl-prawns', name: 'Prawn Cocktail', price: '£8.95', description: 'Classic with Marie Rose sauce' },
                    { id: 'sl-melons', name: 'Melon & Parma Ham', price: '£8.95', description: 'Fresh cantaloupe with prosciutto' }
                ]
            },
            {
                name: 'Main Courses',
                items: [
                    { id: 'sl-beef', name: 'Roast Beef', price: '£18.95', description: 'With Yorkshire pudding and gravy' },
                    { id: 'sl-lamb', name: 'Roast Lamb', price: '£19.95', description: 'With mint sauce and vegetables' },
                    { id: 'sl-chicken', name: 'Roast Chicken', price: '£16.95', description: 'With stuffing and bread sauce' },
                    { id: 'sl-pork', name: 'Roast Pork', price: '£17.95', description: 'With apple sauce and crackling' }
                ]
            },
            {
                name: 'Desserts',
                items: [
                    { id: 'sl-pudding', name: 'Sticky Toffee Pudding', price: '£6.95', description: 'With toffee sauce and cream' },
                    { id: 'sl-tart', name: 'Lemon Tart', price: '£6.95', description: 'With crème fraîche' },
                    { id: 'sl-crumble', name: 'Apple & Blackberry Crumble', price: '£6.95', description: 'Served with custard' },
                    { id: 'sl-cheesecake', name: 'Bakewell Cheesecake', price: '£6.95', description: 'With cherry compote' }
                ]
            }
        ]
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SAMPLE_EXPERIENCES,
        SAMPLE_AVAILABLE_SLOTS,
        TIME_SLOTS_BY_DAY,
        SAMPLE_MENU_DATA
    };
}
