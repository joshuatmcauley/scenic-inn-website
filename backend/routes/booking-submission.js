// Booking submission system - sends basic details to Dojo and handles preorders
const express = require('express');
const router = express.Router();
const axios = require('axios');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Dojo API configuration
const dojoClient = axios.create({
    baseURL: 'https://api.dojo.tech/',
    headers: {
        'Authorization': `Basic ${process.env.DOJO_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'version': '2024-02-05'
    },
    timeout: 10000
});

// Email configuration
const emailTransporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to your email provider
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Generate PDF for preorder
function generatePreorderPDF(bookingData, preorderData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const pdfPath = path.join(__dirname, '../temp', `preorder-${Date.now()}.pdf`);
            
            // Ensure temp directory exists
            const tempDir = path.dirname(pdfPath);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);
            
            // Header
            doc.fontSize(20)
               .text('The Scenic Inn - Preorder Details', { align: 'center' })
               .moveDown();
            
            // Booking Information
            doc.fontSize(14)
               .text('Booking Information:', { underline: true })
               .fontSize(12)
               .text(`Date: ${bookingData.date}`)
               .text(`Time: ${bookingData.time}`)
               .text(`Party Size: ${bookingData.partySize} people`)
               .text(`Customer: ${bookingData.firstName} ${bookingData.lastName}`)
               .text(`Email: ${bookingData.email}`)
               .text(`Phone: ${bookingData.phone}`)
               .moveDown();
            
            // Special Requests
            if (bookingData.specialRequests) {
                doc.fontSize(14)
                   .text('Special Requests:', { underline: true })
                   .fontSize(12)
                   .text(bookingData.specialRequests)
                   .moveDown();
            }
            
            // Preorder Details
            if (preorderData && preorderData.length > 0) {
                doc.fontSize(14)
                   .text('Preorder Menu Selections:', { underline: true })
                   .moveDown();
                
                preorderData.forEach((person, index) => {
                    doc.fontSize(12)
                       .text(`Person ${index + 1}:`, { bold: true })
                       .text(`  Starter: ${person.starter || 'Not selected'}`)
                       .text(`  Main: ${person.main || 'Not selected'}`)
                       .text(`  Dessert: ${person.dessert || 'Not selected'}`)
                       .moveDown();
                });
            }
            
            doc.end();
            
            stream.on('finish', () => {
                resolve(pdfPath);
            });
            
            stream.on('error', reject);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Send email with PDF attachment
async function sendPreorderEmail(pdfPath, bookingData) {
    const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: process.env.RESTAURANT_EMAIL || 'restaurant@thescenicinn.com',
        subject: `Preorder for ${bookingData.firstName} ${bookingData.lastName} - ${bookingData.date}`,
        text: `New booking with preorder details attached.\n\nBooking Details:\nDate: ${bookingData.date}\nTime: ${bookingData.time}\nParty Size: ${bookingData.partySize}\nCustomer: ${bookingData.firstName} ${bookingData.lastName}\nEmail: ${bookingData.email}\nPhone: ${bookingData.phone}`,
        attachments: [
            {
                filename: `preorder-${bookingData.date}-${bookingData.lastName}.pdf`,
                path: pdfPath
            }
        ]
    };
    
    try {
        const info = await emailTransporter.sendMail(mailOptions);
        console.log('Preorder email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending preorder email:', error);
        return { success: false, error: error.message };
    }
}

// Submit booking to Dojo (if they have booking endpoints)
async function submitToDojo(bookingData) {
    try {
        // Try to create a booking in Dojo
        // Note: This might not work if Dojo doesn't have booking endpoints
        // We'll try a few different approaches
        
        const dojoBookingData = {
            date: bookingData.date,
            time: bookingData.time,
            partySize: parseInt(bookingData.partySize),
            customerName: `${bookingData.firstName} ${bookingData.lastName}`,
            customerEmail: bookingData.email,
            customerPhone: bookingData.phone,
            specialRequests: bookingData.specialRequests || '',
            reference: `SCENIC-${Date.now()}`
        };
        
        // Try different possible Dojo endpoints
        const endpoints = [
            '/bookings',
            '/reservations',
            '/tables',
            '/customers'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await dojoClient.post(endpoint, dojoBookingData);
                console.log(`Successfully submitted to Dojo endpoint: ${endpoint}`);
                return { success: true, endpoint, data: response.data };
            } catch (error) {
                if (error.response?.status !== 404) {
                    console.log(`Dojo endpoint ${endpoint} failed:`, error.response?.status);
                }
            }
        }
        
        // If no Dojo endpoints work, we'll store locally and email
        console.log('No Dojo booking endpoints found, storing locally');
        return { success: false, reason: 'No Dojo booking endpoints available' };
        
    } catch (error) {
        console.error('Error submitting to Dojo:', error);
        return { success: false, error: error.message };
    }
}

// Main booking submission endpoint
// Accepts two shapes:
// 1) { bookingData, preorderData }
// 2) bookingData directly (from current frontend)
router.post('/', async (req, res) => {
    try {
        let bookingData = req.body?.bookingData || req.body;
        const preorderData = req.body?.preorderData || req.body?.preorder || [];
        
        console.log('Received booking submission:', bookingData);
        
        // Step 1: Skip Dojo for now per request; just prepare PDF + email
        const dojoResult = { success: false, reason: 'Dojo disabled for beta' };
        
        // Step 2: Handle preorder if present
        let preorderResult = null;
        if (preorderData && preorderData.length > 0) {
            try {
                // Generate PDF
                const pdfPath = await generatePreorderPDF(bookingData, preorderData);
                
                // Send email with PDF
                preorderResult = await sendPreorderEmail(pdfPath, bookingData);
                
                // Clean up PDF file after sending
                setTimeout(() => {
                    if (fs.existsSync(pdfPath)) {
                        fs.unlinkSync(pdfPath);
                    }
                }, 5000);
                
            } catch (error) {
                console.error('Error handling preorder:', error);
                preorderResult = { success: false, error: error.message };
            }
        }
        
        // Step 3: Store booking locally (backup)
        // You can add database storage here if needed
        
        // Step 4: Send confirmation email to customer
        try {
            const customerEmail = {
                from: process.env.EMAIL_USER || 'your-email@gmail.com',
                to: bookingData.email,
                subject: `Booking Confirmation - The Scenic Inn`,
                text: `Dear ${bookingData.firstName},\n\nThank you for your booking at The Scenic Inn.\n\nBooking Details:\nDate: ${bookingData.date}\nTime: ${bookingData.time}\nParty Size: ${bookingData.partySize} people\n\nWe look forward to seeing you!\n\nBest regards,\nThe Scenic Inn Team`
            };
            
            await emailTransporter.sendMail(customerEmail);
        } catch (error) {
            console.error('Error sending customer confirmation:', error);
        }
        
        // Return response
        res.json({
            success: true,
            message: 'Booking submitted successfully',
            dojoResult,
            preorderResult,
            bookingReference: `SCENIC-${Date.now()}`
        });
        
    } catch (error) {
        console.error('Error processing booking:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process booking',
            details: error.message
        });
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Booking submission system is working',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
