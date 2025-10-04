// Test different Dojo API base URLs
require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.DOJO_API_KEY;
const vendorId = process.env.DOJO_VENDOR_ID;
const restaurantId = process.env.DOJO_RESTAURANT_ID;

console.log('Testing different Dojo API base URLs...');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT SET');
console.log('Vendor ID:', vendorId);
console.log('Restaurant ID:', restaurantId);

// Test different base URLs
const baseURLs = [
    'https://api.dojo.tech',
    'https://api.dojo.com',
    'https://api.dojo.io',
    'https://sandbox-api.dojo.tech',
    'https://sandbox-api.dojo.com',
    'https://sandbox-api.dojo.io',
    'https://api-sandbox.dojo.tech',
    'https://api-sandbox.dojo.com',
    'https://api-sandbox.dojo.io',
    'https://dojo-api.tech',
    'https://dojo-api.com',
    'https://dojo-api.io'
];

const testEndpoints = [
    '/',
    '/api',
    '/v1',
    '/menus',
    '/api/menus',
    '/v1/menus',
    '/restaurants',
    '/api/restaurants',
    '/v1/restaurants'
];

async function testBaseURL(baseURL) {
    console.log(`\n🔍 Testing base URL: ${baseURL}`);
    
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

    let successCount = 0;
    let authSuccess = false;

    for (const endpoint of testEndpoints) {
        try {
            const response = await client.get(endpoint);
            console.log(`✅ SUCCESS (${response.status}): ${endpoint}`);
            
            if (response.status === 200 && endpoint === '/') {
                console.log('Response type:', typeof response.data);
                if (typeof response.data === 'string' && response.data.includes('html')) {
                    console.log('📄 This appears to be a documentation page');
                } else {
                    console.log('📊 This appears to be an API response');
                    authSuccess = true;
                }
            }
            
            successCount++;
        } catch (error) {
            const status = error.response?.status || 'NO_RESPONSE';
            if (status === 401) {
                console.log(`🔑 AUTH (${status}): ${endpoint} - Authentication working but endpoint may not exist`);
                authSuccess = true;
            } else if (status !== 404) {
                console.log(`❌ FAILED (${status}): ${endpoint}`);
            }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📊 ${baseURL}: ${successCount}/${testEndpoints.length} endpoints successful`);
    if (authSuccess) {
        console.log('🔑 Authentication appears to be working with this base URL');
    }
    
    return { baseURL, successCount, authSuccess };
}

async function runTests() {
    const results = [];
    
    for (const baseURL of baseURLs) {
        const result = await testBaseURL(baseURL);
        results.push(result);
    }
    
    console.log('\n📊 SUMMARY:');
    results.forEach(result => {
        if (result.authSuccess) {
            console.log(`🔑 ${result.baseURL} - Authentication working`);
        }
    });
    
    const bestResult = results.reduce((best, current) => 
        current.successCount > best.successCount ? current : best
    );
    
    console.log(`\n🏆 Best base URL: ${bestResult.baseURL} (${bestResult.successCount} successful endpoints)`);
    
    if (bestResult.authSuccess) {
        console.log('\n✅ RECOMMENDATION: Update your .env file with this base URL:');
        console.log(`DOJO_API_BASE_URL=${bestResult.baseURL}`);
    } else {
        console.log('\n❌ No working base URL found. You may need to:');
        console.log('1. Check Dojo documentation for the correct base URL');
        console.log('2. Contact Dojo support');
        console.log('3. Verify your API key permissions');
    }
}

runTests().catch(console.error);
