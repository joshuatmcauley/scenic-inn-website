// Simple test script to check Dojo API connection
require('dotenv').config();

console.log('Testing Dojo API configuration...');
console.log('DOJO_API_BASE_URL:', process.env.DOJO_API_BASE_URL);
console.log('DOJO_API_KEY:', process.env.DOJO_API_KEY ? 'SET' : 'NOT SET');
console.log('DOJO_VENDOR_ID:', process.env.DOJO_VENDOR_ID);
console.log('DOJO_RESTAURANT_ID:', process.env.DOJO_RESTAURANT_ID);

const dojoAPI = require('./config/dojo');

async function testConnection() {
    try {
        console.log('\nTesting connection...');
        const result = await dojoAPI.testConnection();
        console.log('Connection result:', result);
    } catch (error) {
        console.error('Connection error:', error.message);
    }
}

async function testExperiences() {
    try {
        console.log('\nTesting experiences...');
        const result = await dojoAPI.getExperiences();
        console.log('Experiences result:', result);
    } catch (error) {
        console.error('Experiences error:', error.message);
    }
}

async function testProducts() {
    try {
        console.log('\nTesting products...');
        const result = await dojoAPI.getAllProducts();
        console.log('Products result:', result);
    } catch (error) {
        console.error('Products error:', error.message);
    }
}

async function runTests() {
    await testConnection();
    await testExperiences();
    await testProducts();
}

runTests();
