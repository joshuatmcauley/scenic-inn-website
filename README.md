# The Scenic Inn - Custom Booking System

A custom booking system that integrates with Dojo's API to provide advanced booking functionality, including mandatory preordering for large parties (11+ people).

## Features

- **Custom Booking Flow**: Multi-step booking process with progress tracking
- **Large Party Management**: Automatic preorder requirement for parties of 11+ people
- **Individual Ordering**: Each person in large parties must select their meals
- **Dojo Integration**: Seamless integration with Dojo's booking and POS system
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Validation**: Form validation and error handling

## Project Structure

```
01-website/
├── backend/
│   ├── config/
│   │   └── dojo.js              # Dojo API integration
│   ├── middleware/
│   │   └── validation.js        # Input validation
│   ├── routes/
│   │   └── dojo.js              # Dojo API routes
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── index.html               # Main booking page
│   ├── styles.css               # Styling
│   └── script.js                # Frontend logic
└── README.md
```

## Setup Instructions

### 1. Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd 01-website/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   Edit `.env` file with your Dojo API credentials:
   ```env
   # Dojo API Configuration
   DOJO_API_BASE_URL=https://api.dojo.com
   DOJO_API_KEY=your_dojo_api_key_here
   DOJO_VENDOR_ID=your_dojo_vendor_id_here
   DOJO_RESTAURANT_ID=your_dojo_restaurant_id_here
   ```

5. **Start the backend server:**
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:3001`

### 2. Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd 01-website/frontend
   ```

2. **Open the booking page:**
   - Simply open `index.html` in your browser, or
   - Use a local server like Live Server (VS Code extension)

3. **Access the booking system:**
   - Open `http://localhost:3000` (if using Live Server)
   - Or open `index.html` directly in your browser

### 3. Dojo API Configuration

You'll need to obtain the following from your Dojo dashboard:

1. **API Key**: Found in your Dojo account settings
2. **Vendor ID**: Your unique vendor identifier
3. **Restaurant ID**: Your restaurant's unique identifier

## How It Works

### Booking Flow

1. **Party Details**: Customer selects party size and dining experience
2. **Date & Time**: Customer chooses available date and time slot
3. **Menu Selection**: For parties of 11+, each person must select their meals
4. **Contact Details**: Customer provides contact information
5. **Confirmation**: Booking is created in Dojo and confirmation is shown

### Large Party Logic

- **Parties 1-10**: Standard booking flow, no preorder required
- **Parties 11+**: Mandatory preorder for each person
- **Validation**: System ensures all people have selected meals before proceeding

### Dojo Integration

The system integrates with Dojo's API to:
- Fetch available booking slots
- Get menu items for each experience
- Create bookings with preorder data
- Handle booking confirmations and updates

## API Endpoints

### Backend API Routes

- `GET /api/dojo/experiences` - Get available dining experiences
- `GET /api/dojo/availability` - Get available booking slots
- `GET /api/dojo/experiences/:id/menu` - Get menu items for an experience
- `POST /api/dojo/bookings` - Create a new booking
- `GET /api/dojo/bookings/:id` - Get booking details
- `PUT /api/dojo/bookings/:id` - Update booking
- `DELETE /api/dojo/bookings/:id` - Cancel booking

## Customization

### Adding New Menu Items

1. Update your Dojo experience with new menu items
2. The system will automatically fetch and display them

### Modifying Party Size Limits

Edit the validation in `backend/middleware/validation.js`:
```javascript
// Change the minimum party size for preorder requirement
if (bookingData.party_size >= 11) { // Change 11 to your desired number
```

### Styling Changes

Modify `frontend/styles.css` to match your brand colors and styling.

## Testing

### Test the Booking Flow

1. **Small Party (1-10 people):**
   - Select party size 1-10
   - Complete booking without preorder requirement

2. **Large Party (11+ people):**
   - Select party size 11+
   - Verify preorder requirement appears
   - Test that booking cannot proceed without selecting meals for all people

### API Testing

Use tools like Postman or curl to test the API endpoints:

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test experiences endpoint
curl http://localhost:3001/api/dojo/experiences
```

## Troubleshooting

### Common Issues

1. **API Connection Errors:**
   - Verify Dojo API credentials in `.env` file
   - Check if Dojo API is accessible from your network

2. **CORS Issues:**
   - Ensure frontend and backend are running on correct ports
   - Check CORS configuration in `server.js`

3. **Validation Errors:**
   - Check browser console for JavaScript errors
   - Verify all required fields are filled

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## Deployment

### Production Setup

1. **Environment Variables:**
   - Set production Dojo API credentials
   - Configure production database
   - Set secure JWT secrets

2. **Frontend Deployment:**
   - Upload frontend files to your web server
   - Update API_BASE_URL in `script.js` to point to production backend

3. **Backend Deployment:**
   - Deploy to your preferred hosting platform (Heroku, AWS, etc.)
   - Set up environment variables
   - Configure domain and SSL

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify Dojo API credentials and connectivity
3. Review the validation logic for your specific requirements

## License

MIT License - Feel free to modify and use for your restaurant.
