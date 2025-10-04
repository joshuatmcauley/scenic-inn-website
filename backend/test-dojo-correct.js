// Test Dojo API with correct authentication from official docs
require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.DOJO_API_KEY;
const vendorId = process.env.DOJO_VENDOR_ID;
const restaurantId = process.env.DOJO_RESTAURANT_ID;

console.log('Testing Dojo API with correct authentication...');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT SET');
console.log('Vendor ID:', vendorId);
console.log('Restaurant ID:', restaurantId);

// According to Dojo docs: https://docs.dojo.tech/api#section/Introduction/Errors
const client = axios.create({
    baseURL: 'https://api.dojo.tech/',
    headers: {
        'Authorization': `Basic ${apiKey}`, // Basic auth, not Bearer
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'version': '2024-02-05', // Required version header
        'User-Agent': 'TheScenicInn-BookingSystem/1.0'
    },
    timeout: 10000
});

async function testEndpoint(endpoint) {
    try {
        console.log(`\n🔍 Testing: ${endpoint}`);
        const response = await client.get(endpoint);
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
        } else if (error.response?.status === 403) {
            console.log('🚫 Forbidden - API key lacks permissions');
        } else if (error.response?.status === 404) {
            console.log('📄 Endpoint not found - may not exist');
        }
        
        return false;
    }
}

async function testAllEndpoints() {
    // Test endpoints from the Dojo API documentation
    const endpoints = [
        // Core payment endpoints
        '/payment-intents',
        '/refunds',
        '/customers',
        '/webhooks',
        
        // EPOS endpoints (these might be what we need for restaurant data)
        '/epos/integrations',
        '/epos/integrations/rest',
        '/epos/integrations/ws',
        '/epos/integrations/dojo',
        '/epos/events',
        
        // Terminal endpoints
        '/terminals',
        '/terminal-sessions',
        
        // Capabilities
        '/capabilities'
    ];

    let successCount = 0;
    
    for (const endpoint of endpoints) {
        const success = await testEndpoint(endpoint);
        if (success) successCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 Results: ${successCount}/${endpoints.length} endpoints successful`);
    
    if (successCount > 0) {
        console.log('\n🎉 SUCCESS! Dojo API is working with correct authentication!');
    } else {
        console.log('\n❌ No endpoints worked. Possible issues:');
        console.log('1. API key is incorrect or expired');
        console.log('2. API key lacks required permissions');
        console.log('3. Account needs to be activated for API access');
    }
}

testAllEndpoints().catch(console.error);

