const express = require('express');
const nodemailer = require('nodemailer');
const { dbHelpers } = require('../database-production');
const router = express.Router();

// Email configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Submit booking
router.post('/submission', async (req, res) => {
  try {
    const { bookingData, menuSelections, contactEmail } = req.body;

    // Validate required fields
    if (!bookingData || !contactEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking information'
      });
    }

    // Validate 24-hour rule
    const bookingDate = new Date(bookingData.date);
    const now = new Date();
    const hoursUntilBooking = (bookingDate - now) / (1000 * 60 * 60);
    
    if (hoursUntilBooking < 24) {
      return res.status(400).json({
        success: false,
        message: 'Bookings must be made at least 24 hours in advance'
      });
    }

    // Save booking to database
    const booking = await dbHelpers.createBooking({
      ...bookingData,
      menuSelections: menuSelections || []
    });

    // Send confirmation email
    try {
      await sendBookingEmail(contactEmail, bookingData, menuSelections);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the booking if email fails
    }

    res.json({
      success: true,
      message: 'Booking submitted successfully! You will receive a confirmation email shortly.',
      bookingId: booking.id
    });

  } catch (error) {
    console.error('Booking submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process booking'
    });
  }
});

// Send booking confirmation email
async function sendBookingEmail(contactEmail, bookingData, menuSelections) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: [contactEmail, process.env.RESTAURANT_EMAIL || process.env.EMAIL_USER],
    subject: `Group Booking Confirmation - The Scenic Inn - ${bookingData.date}`,
    html: `
      <h2>Thank you for your group booking at The Scenic Inn!</h2>
      <p><strong>Booking Details:</strong></p>
      <ul>
        <li>Date: ${bookingData.date}</li>
        <li>Time: ${bookingData.time}</li>
        <li>Party Size: ${bookingData.partySize}</li>
        <li>Contact Name: ${bookingData.contactName}</li>
        <li>Contact Email: ${bookingData.contactEmail}</li>
        <li>Special Requests: ${bookingData.specialRequests || 'None'}</li>
      </ul>
      
      ${menuSelections && menuSelections.length > 0 ? `
        <h3>Menu Selections:</h3>
        ${menuSelections.map((person, index) => `
          <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px;">
            <h4>Person ${index + 1}: ${person.name}</h4>
            ${person.selections.map(selection => `
              <p><strong>${selection.course}:</strong> ${selection.item} - £${selection.price}</p>
            `).join('')}
          </div>
        `).join('')}
      ` : ''}
      
      <p>We look forward to welcoming you!</p>
      <p>Best regards,<br>The Scenic Inn Team</p>
    `
  };
  
  await transporter.sendMail(mailOptions);
}

module.exports = router;
