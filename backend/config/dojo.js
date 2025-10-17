const axios = require('axios');
require('dotenv').config();

class DojoAPI {
  constructor() {
    this.baseURL = process.env.DOJO_API_BASE_URL || 'https://api.dojo.tech';
    this.eposBaseURL = process.env.DOJO_EPOS_BASE_URL || 'https://api.dojo.tech';
    this.apiKey = process.env.DOJO_API_KEY || 'demo-key';
    this.vendorId = process.env.DOJO_VENDOR_ID || 'demo-vendor';
    this.restaurantId = process.env.DOJO_RESTAURANT_ID || 'demo-restaurant';
    
    // Log configuration status
    console.log('Dojo API Configuration:');
    console.log('Base URL:', this.baseURL);
    console.log('API Key:', this.apiKey ? 'SET' : 'NOT SET');
    console.log('Vendor ID:', this.vendorId);
    console.log('Restaurant ID:', this.restaurantId);
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'TheScenicInn-BookingSystem/1.0'
      },
      timeout: 10000
    });
  }

  // Get available booking slots
  async getAvailableSlots(date, partySize) {
    try {
      const response = await this.client.get('/bookings/availability', {
        params: {
          date: date,
          party_size: partySize,
          vendor_id: this.vendorId,
          restaurant_id: this.restaurantId
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching available slots:', error.response?.data || error.message);
      throw new Error('Failed to fetch available booking slots');
    }
  }

  // Create a booking (reservation)
  async createBooking(bookingData) {
    try {
      // Create EPOS client for booking operations
      const eposClient = axios.create({
        baseURL: this.eposBaseURL,
        headers: {
          'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'TheScenicInn-BookingSystem/1.0',
          'version': '2025-09-10',
          'reseller-id': this.vendorId,
          'software-house-id': this.restaurantId
        },
        timeout: 10000
      });

      // Map booking data to Dojo reservation format
      const reservationPayload = {
        startTime: `${bookingData.date}T${bookingData.time}:00.000Z`,
        covers: parseInt(bookingData.party_size),
        customerName: bookingData.customer_name,
        customerEmail: bookingData.customer_email,
        customerPhone: bookingData.customer_phone,
        specialRequests: bookingData.special_requests || '',
        reference: bookingData.reference || `SCENIC-${Date.now()}`
      };

      console.log('Creating Dojo reservation with payload:', reservationPayload);

      // Create reservation using EPOS Data API
      const response = await eposClient.post('/v1/reservations', reservationPayload);
      return response.data;
    } catch (error) {
      console.error('Error creating Dojo reservation:', error.response?.data || error.message);
      throw new Error('Failed to create Dojo reservation');
    }
  }

  // Get booking details
  async getBooking(bookingId) {
    try {
      const response = await this.client.get(`/bookings/${bookingId}`, {
        params: {
          vendor_id: this.vendorId
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching booking:', error.response?.data || error.message);
      throw new Error('Failed to fetch booking details');
    }
  }

  // Update booking
  async updateBooking(bookingId, updateData) {
    try {
      const response = await this.client.put(`/bookings/${bookingId}`, {
        vendor_id: this.vendorId,
        ...updateData
      });
      return response.data;
    } catch (error) {
      console.error('Error updating booking:', error.response?.data || error.message);
      throw new Error('Failed to update booking');
    }
  }

  // Cancel booking
  async cancelBooking(bookingId, reason = 'Customer cancellation') {
    try {
      const response = await this.client.delete(`/bookings/${bookingId}`, {
        data: {
          vendor_id: this.vendorId,
          cancellation_reason: reason
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling booking:', error.response?.data || error.message);
      throw new Error('Failed to cancel booking');
    }
  }

  // Get all products from Dojo
  async getAllProducts() {
    try {
      const response = await this.client.get('/v1/products', {
        params: {
          vendor_id: this.vendorId,
          restaurant_id: this.restaurantId
        }
      });
      
      // Check if we got HTML instead of JSON
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        throw new Error('Products endpoint returned HTML instead of JSON');
      }
      
      console.log('Successfully fetched all products:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching all products:', error.response?.data || error.message);
      throw new Error('Failed to fetch products from Dojo API - check your API credentials and connection');
    }
  }

  // Get menu items for preordering
  async getMenuItems(experienceId) {
    try {
      // Try different possible endpoints for menu items based on Dojo RMS structure
      const endpoints = [
        `/v1/settings/menu-manager/products`,
        `/v1/pre-order-menus/${experienceId}/products`,
        `/v1/pre-order-menus/${experienceId}/items`,
        `/v1/experiences/${experienceId}/menu`,
        `/v1/schedules/${experienceId}/menu`,
        `/v1/menus/${experienceId}`,
        `/settings/menu-manager/products`,
        `/pre-order-menus/${experienceId}/products`,
        `/pre-order-menus/${experienceId}/items`,
        `/experiences/${experienceId}/menu`,
        `/schedules/${experienceId}/menu`,
        `/menus/${experienceId}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.client.get(endpoint, {
            params: {
              vendor_id: this.vendorId,
              restaurant_id: this.restaurantId
            }
          });
          
          // Check if we got HTML instead of JSON (wrong endpoint)
          if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
            console.log(`Menu endpoint ${endpoint} returned HTML instead of JSON - wrong endpoint`);
            continue;
          }
          
          console.log(`Success with menu endpoint: ${endpoint}`, response.data);
          return response.data;
        } catch (endpointError) {
          console.log(`Failed with menu endpoint: ${endpoint}`, endpointError.message);
          continue;
        }
      }
      
      throw new Error('All menu endpoints failed');
    } catch (error) {
      console.error('Error fetching menu items:', error.response?.data || error.message);
      throw new Error('Failed to fetch menu items from Dojo API');
    }
  }

  // Test API connection
  async testConnection() {
    try {
      console.log('=== DOJO API DEBUG TEST ===');
      console.log('API Key (first 10 chars):', this.apiKey.substring(0, 10) + '...');
      console.log('Vendor ID:', this.vendorId);
      console.log('Restaurant ID:', this.restaurantId);
      
      // Test different possible API endpoints
      const possibleURLs = [
        'https://api.dojo.tech',
        'https://api.dojo.com',
        'https://api.dojopayments.com',
        'https://sandbox-api.dojo.tech'
      ];
      
      for (const testURL of possibleURLs) {
        console.log(`Testing URL: ${testURL}`);
        const basicAuth = `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`;
        
        console.log('Testing with Basic Auth on', testURL);
        
        const client = axios.create({
          baseURL: testURL,
          headers: {
            'Authorization': basicAuth,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'TheScenicInn-BookingSystem/1.0',
            'version': '2025-09-10',
            'reseller-id': this.vendorId,
            'software-house-id': this.restaurantId
          },
          timeout: 15000
        });

        // Try the actual booking endpoint first
        try {
          console.log('Testing /v1/reservations endpoint...');
          const response = await client.get('/v1/reservations');
          return {
            connected: true,
            status: response.status,
            endpoint: '/v1/reservations',
            baseURL: testURL,
            authMethod: 'Basic Auth',
            data: response.data
          };
        } catch (error) {
          console.log('v1/reservations failed:', error.response?.status, error.response?.data);
          
          // Try a different endpoint
          try {
            console.log('Testing /v1/areas endpoint...');
            const response = await client.get('/v1/areas');
            return {
              connected: true,
              status: response.status,
              endpoint: '/v1/areas',
              baseURL: testURL,
              authMethod: 'Basic Auth',
              data: response.data
            };
          } catch (error2) {
            console.log('v1/areas failed:', error2.response?.status, error2.response?.data);
            
            // Try a different endpoint
            try {
              console.log('Testing /v1/tables endpoint...');
              const response = await client.get('/v1/tables');
              return {
                connected: true,
                status: response.status,
                endpoint: '/v1/tables',
                baseURL: testURL,
                authMethod: 'Basic Auth',
                data: response.data
              };
            } catch (error3) {
              console.log('v1/tables failed:', error3.response?.status, error3.response?.data);
              console.log('All endpoints failed on', testURL);
              // Continue to next URL
            }
          }
        }
      }
      
      // If we get here, all URLs failed
      return {
        connected: false,
        error: 'All URLs and endpoints failed',
        baseURL: 'Multiple URLs tested',
        authMethod: 'Basic Auth',
        details: 'Tested multiple base URLs and endpoints - all failed'
      };
    } catch (error) {
      console.error('Dojo API connection test failed:', error);
      return {
        connected: false,
        error: error.message,
        baseURL: 'https://api.dojo.tech',
        details: error.response?.data || 'No additional details'
      };
    }
  }

  // Get available experiences
  async getExperiences() {
    try {
      // Try different possible endpoints for Dojo API
      const endpoints = [
        '/v1/experiences',
        '/v1/menus',
        '/v1/products',
        '/v1/preorder-menus',
        '/v1/schedules',
        '/experiences',
        '/menus',
        '/products',
        '/preorder-menus',
        '/schedules'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.client.get(endpoint, {
            params: {
              vendor_id: this.vendorId,
              restaurant_id: this.restaurantId
            }
          });
          
          // Check if we got HTML instead of JSON (wrong endpoint)
          if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
            console.log(`Endpoint ${endpoint} returned HTML instead of JSON - wrong endpoint`);
            continue;
          }
          
          console.log(`Success with endpoint: ${endpoint}`, response.data);
          return {
            success: true,
            source: 'dojo',
            endpoint: endpoint,
            data: response.data
          };
        } catch (endpointError) {
          console.log(`Failed with endpoint: ${endpoint}`, endpointError.message);
          continue;
        }
      }
      
      throw new Error('All endpoints failed - no valid Dojo API endpoint found');
    } catch (error) {
      console.error('Error fetching experiences from Dojo:', error.response?.data || error.message);
      throw new Error('Failed to fetch experiences from Dojo API - check your API credentials and connection');
    }
  }
}

module.exports = new DojoAPI();
