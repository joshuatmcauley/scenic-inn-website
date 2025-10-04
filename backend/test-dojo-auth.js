// Test different authentication methods for Dojo API
require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.DOJO_API_KEY;
const vendorId = process.env.DOJO_VENDOR_ID;
const restaurantId = process.env.DOJO_RESTAURANT_ID;

// Test different base URLs and auth methods
const testConfigs = [
    {
        name: 'Bearer Token - api.dojo.tech',
        baseURL: 'https://api.dojo.tech',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    },
    {
        name: 'Basic Auth - api.dojo.tech',
        baseURL: 'https://api.dojo.tech',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    },
    {
        name: 'Bearer Token - api.dojo.com',
        baseURL: 'https://api.dojo.com',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    },
    {
        name: 'API Key in Header - api.dojo.tech',
        baseURL: 'https://api.dojo.tech',
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    },
    {
        name: 'API Key in Header - api.dojo.com',
        baseURL: 'https://api.dojo.com',
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    }
];

const endpoints = [
    '/',
    '/api',
    '/v1',
    '/menus',
    '/api/menus',
    '/v1/menus',
    '/restaurants',
    '/api/restaurants',
    '/v1/restaurants',
    `/restaurants/${restaurantId}`,
    `/api/restaurants/${restaurantId}`,
    `/v1/restaurants/${restaurantId}`,
    `/vendors/${vendorId}`,
    `/api/vendors/${vendorId}`,
    `/v1/vendors/${vendorId}`,
    `/vendors/${vendorId}/restaurants`,
    `/api/vendors/${vendorId}/restaurants`,
    `/v1/vendors/${vendorId}/restaurants`,
    `/vendors/${vendorId}/restaurants/${restaurantId}`,
    `/api/vendors/${vendorId}/restaurants/${restaurantId}`,
    `/v1/vendors/${vendorId}/restaurants/${restaurantId}`
];

async function testConfig(config) {
    console.log(`\n🔍 Testing: ${config.name}`);
    console.log(`Base URL: ${config.baseURL}`);
    
    const client = axios.create({
        baseURL: config.baseURL,
        headers: config.headers,
        timeout: 10000
    });

    let successCount = 0;
    let totalTests = 0;

    for (const endpoint of endpoints) {
        try {
            totalTests++;
            const response = await client.get(endpoint);
            console.log(`✅ SUCCESS (${response.status}): ${endpoint}`);
            if (response.data && typeof response.data === 'object') {
                console.log('Response keys:', Object.keys(response.data));
            }
            successCount++;
        } catch (error) {
            const status = error.response?.status || 'NO_RESPONSE';
            if (status !== 404) { // Only log non-404 errors
                console.log(`❌ FAILED (${status}): ${endpoint}`);
                if (error.response?.data) {
                    console.log('Error data:', JSON.stringify(error.response.data, null, 2));
                }
            }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`📊 ${config.name}: ${successCount}/${totalTests} endpoints successful`);
    return successCount;
}

async function runAllTests() {
    console.log('Testing Dojo API with different authentication methods...');
    console.log('API Key:', apiKey ? 'SET' : 'NOT SET');
    console.log('Vendor ID:', vendorId);
    console.log('Restaurant ID:', restaurantId);

    let bestConfig = null;
    let bestScore = 0;

    for (const config of testConfigs) {
        const score = await testConfig(config);
        if (score > bestScore) {
            bestScore = score;
            bestConfig = config;
        }
    }

    console.log(`\n🏆 Best configuration: ${bestConfig?.name} (${bestScore} successful endpoints)`);
}

runAllTests().catch(console.error);
