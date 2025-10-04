// Test Dojo production API with the actual key
require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.DOJO_API_KEY;
const vendorId = process.env.DOJO_VENDOR_ID;
const restaurantId = process.env.DOJO_RESTAURANT_ID;

console.log('Testing Dojo Production API...');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT SET');
console.log('Vendor ID:', vendorId);
console.log('Restaurant ID:', restaurantId);

// Test different production endpoints
const testEndpoints = [
    'https://api.dojo.tech/menus',
    'https://api.dojo.tech/restaurants',
    'https://api.dojo.tech/restaurants/' + restaurantId,
    'https://api.dojo.tech/vendors/' + vendorId,
    'https://api.dojo.tech/vendors/' + vendorId + '/restaurants',
    'https://api.dojo.tech/vendors/' + vendorId + '/restaurants/' + restaurantId,
    'https://api.dojo.tech/experiences',
    'https://api.dojo.tech/products',
    'https://api.dojo.tech/bookings',
    'https://api.dojo.tech/availability'
];

async function testEndpoint(url) {
    try {
        console.log(`\n🔍 Testing: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'TheScenicInn-BookingSystem/1.0'
            },
            timeout: 10000
        });
        
        console.log(`✅ SUCCESS (${response.status})`);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        const status = error.response?.status || 'NO_RESPONSE';
        console.log(`❌ FAILED (${status})`);
        
        if (error.response?.data) {
            console.log('Error data:', JSON.stringify(error.response.data, null, 2));
        }
        
        if (error.response?.status === 401) {
            console.log('🔑 Authentication failed - check your API key');
        }
        
        return false;
    }
}

async function runTests() {
    let successCount = 0;
    
    for (const endpoint of testEndpoints) {
        const success = await testEndpoint(endpoint);
        if (success) successCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 Results: ${successCount}/${testEndpoints.length} endpoints successful`);
    
    if (successCount === 0) {
        console.log('\n🔧 Troubleshooting suggestions:');
        console.log('1. Verify your API key is correct and complete');
        console.log('2. Check if your API key has the right permissions');
        console.log('3. Contact Dojo support if the key seems correct');
    }
}

runTests().catch(console.error);
