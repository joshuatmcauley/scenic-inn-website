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

  // Create a booking (reservation) using Dojo Bookings API
  async createBooking(bookingData) {
    try {
      console.log('Creating Dojo booking with data:', bookingData);
      
      // Map booking data to Dojo Bookings API format
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

      // Try different Dojo Bookings API endpoints
      const bookingEndpoints = [
        '/v1/reservations',
        '/bookings',
        '/reservations',
        '/api/v1/reservations',
        '/api/bookings'
      ];

      for (const endpoint of bookingEndpoints) {
        try {
          console.log(`Trying Dojo Bookings endpoint: ${endpoint}`);
          
          // Use the main client with Bearer token for Dojo Bookings API
          const response = await this.client.post(endpoint, reservationPayload);
          
          console.log(`Success with Dojo Bookings endpoint: ${endpoint}`, response.data);
          return {
            success: true,
            dojoBookingId: response.data.id || response.data.reservationId,
            data: response.data
          };
        } catch (endpointError) {
          console.log(`Failed with Dojo Bookings endpoint: ${endpoint}`, endpointError.response?.status, endpointError.response?.data);
          continue;
        }
      }
      
      throw new Error('All Dojo Bookings API endpoints failed');
    } catch (error) {
      console.error('Error creating Dojo reservation:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
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
      console.log('=== DOJO BOOKINGS API TEST ===');
      console.log('API Key (first 10 chars):', this.apiKey.substring(0, 10) + '...');
      console.log('Vendor ID:', this.vendorId);
      console.log('Restaurant ID:', this.restaurantId);
      
      console.log('Testing Dojo Bookings API endpoints...');
      
      // Test different Dojo Bookings API endpoints
      const bookingEndpoints = [
        '/v1/reservations',
        '/bookings',
        '/reservations',
        '/api/v1/reservations',
        '/api/bookings',
        '/v1/availability',
        '/availability'
      ];

      for (const endpoint of bookingEndpoints) {
        try {
          console.log(`Testing Dojo Bookings endpoint: ${endpoint}`);
          
          // Use GET request to test endpoint availability
          const response = await this.client.get(endpoint);
          
          console.log(`Success with Dojo Bookings endpoint: ${endpoint}`, response.status);
          return {
            connected: true,
            status: response.status,
            endpoint: endpoint,
            baseURL: this.baseURL,
            authMethod: 'Bearer Token',
            data: response.data,
            note: 'Dojo Bookings API accessible'
          };
        } catch (error) {
          console.log(`Failed with Dojo Bookings endpoint: ${endpoint}`, error.response?.status, error.response?.data);
          continue;
        }
      }
      
      return {
        connected: false,
        error: 'Dojo Bookings API endpoints not accessible',
        baseURL: this.baseURL,
        authMethod: 'Bearer Token',
        details: {
          message: 'Dojo Bookings API endpoints not found',
          suggestion: 'Check if your Dojo account has Bookings API access enabled',
          tested_endpoints: bookingEndpoints,
          note: 'You may need to contact Dojo support to enable Bookings API access'
        }
      };
    } catch (error) {
      console.error('Dojo API connection test failed:', error);
      return {
        connected: false,
        error: error.message,
        baseURL: this.baseURL,
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
