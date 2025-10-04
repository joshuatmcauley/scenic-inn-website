// Test different Dojo API endpoints to find the correct ones
require('dotenv').config();
const axios = require('axios');

const baseURL = process.env.DOJO_API_BASE_URL || 'https://api.dojo.tech';
const apiKey = process.env.DOJO_API_KEY;
const vendorId = process.env.DOJO_VENDOR_ID;
const restaurantId = process.env.DOJO_RESTAURANT_ID;

const client = axios.create({
    baseURL: baseURL,
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'TheScenicInn-BookingSystem/1.0'
    },
    timeout: 10000
});

async function testEndpoint(endpoint) {
    try {
        console.log(`\nTesting: ${endpoint}`);
        const response = await client.get(endpoint);
        console.log(`✅ SUCCESS (${response.status}): ${endpoint}`);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log(`❌ FAILED (${error.response?.status || 'NO_RESPONSE'}): ${endpoint}`);
        if (error.response?.data) {
            console.log('Error data:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

async function testAllEndpoints() {
    const endpoints = [
        // Common API endpoints
        '/',
        '/api',
        '/api/v1',
        '/v1',
        
        // Dojo specific endpoints
        '/api/v1/restaurants',
        `/api/v1/restaurants/${restaurantId}`,
        `/api/v1/vendors/${vendorId}`,
        `/api/v1/vendors/${vendorId}/restaurants`,
        `/api/v1/vendors/${vendorId}/restaurants/${restaurantId}`,
        
        // Booking related
        '/api/v1/bookings',
        '/api/v1/reservations',
        '/api/v1/tables',
        '/api/v1/availability',
        
        // Menu related
        '/api/v1/menu',
        '/api/v1/menus',
        '/api/v1/items',
        '/api/v1/products',
        
        // Different base URLs
        'https://api.dojo.com/v1',
        'https://api.dojo.com/v1/restaurants',
        `https://api.dojo.com/v1/restaurants/${restaurantId}`,
        
        // With vendor ID
        `https://api.dojo.com/v1/vendors/${vendorId}`,
        `https://api.dojo.com/v1/vendors/${vendorId}/restaurants`,
        `https://api.dojo.com/v1/vendors/${vendorId}/restaurants/${restaurantId}`,
    ];

    console.log('Testing Dojo API endpoints...');
    console.log('Base URL:', baseURL);
    console.log('API Key:', apiKey ? 'SET' : 'NOT SET');
    console.log('Vendor ID:', vendorId);
    console.log('Restaurant ID:', restaurantId);

    let successCount = 0;
    for (const endpoint of endpoints) {
        const success = await testEndpoint(endpoint);
        if (success) successCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Results: ${successCount}/${endpoints.length} endpoints successful`);
}

testAllEndpoints().catch(console.error);
