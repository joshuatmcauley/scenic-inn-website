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

// Email configuration (SMTP fallback)
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
    secure: true, // 465 = SSL
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
});

// Lightweight transporter verification helper
async function verifyTransporter() {
    try {
        await emailTransporter.verify();
        return { ok: true };
    } catch (e) {
        console.error('Nodemailer transporter verify failed:', e.message);
        return { ok: false, error: e.message };
    }
}

// HTTP email provider (Resend) - avoids SMTP port blocks on hosts
const RESEND_API_KEY = process.env.RESEND_API_KEY;
async function sendEmailViaResend({ from, to, subject, text, html, attachments }) {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
    const payload = { from, to, subject, text, html };
    if (attachments && attachments.length) {
        // Resend supports attachments as { filename, content } base64
        payload.attachments = attachments.map(a => ({ filename: a.filename, content: a.content }));
    }
    const res = await axios.post('https://api.resend.com/emails', payload, {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 15000
    });
    return res.data;
}

function pick(obj, keys, fallback = '') {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  }
  return fallback;
}

function pad(str, len) {
  const s = (str || '').toString();
  return s.length >= len ? s.slice(0, len - 1) + '…' : s + ' '.repeat(len - s.length);
}

function cleanName(name) {
  if (!name) return '';
  // remove " - £xx.xx" or "- £xx" trailing price
  return name.replace(/\s*-\s*£[0-9.,]+\s*$/i, '').trim();
}

// Generate PDF for preorder (table layout)
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
            
      // Normalize fields from various payload shapes
      const firstName = pick(bookingData, ['firstName', 'first_name', 'firstname'], '');
      const lastName = pick(bookingData, ['lastName', 'last_name', 'lastname'], '');
      const fullName = `${firstName} ${lastName}`.trim() || 'N/A';
      const partySize = pick(bookingData, ['partySize', 'party_size'], 'N/A');
      const email = pick(bookingData, ['email', 'contactEmail', 'contact_email'], 'N/A');
      const phone = pick(bookingData, ['phone', 'contactPhone', 'contact_phone'], 'N/A');
      const date = pick(bookingData, ['date'], '');
      const time = pick(bookingData, ['time'], '');

      // Booking Information
            doc.fontSize(14)
               .text('Booking Information:', { underline: true })
               .fontSize(12)
         .text(`Date: ${date}`)
         .text(`Time: ${time}`)
         .text(`Party Size: ${partySize} people`)
         .text(`Customer: ${fullName}`)
         .text(`Email: ${email}`)
         .text(`Phone: ${phone}`)
               .moveDown();
            
            // Special Requests
            if (bookingData.specialRequests) {
                doc.fontSize(14)
                   .text('Special Requests:', { underline: true })
                   .fontSize(12)
                   .text(bookingData.specialRequests)
                   .moveDown();
            }
            
      // Preorder Details (grouped lists)
            if (preorderData && preorderData.length > 0) {
                doc.fontSize(14)
                   .text('Preorder Menu Selections:', { underline: true })
                   .moveDown();
                
        const starters = [];
        const mains = [];
        const desserts = [];

        preorderData.forEach((person, index) => {
          const label = `Person ${person.person_number || index + 1}`;
          if (person.items && Array.isArray(person.items)) {
            person.items.forEach(sel => {
              const course = (sel.course_type || '').toLowerCase();
              const name = cleanName(sel.item_name || sel.name || sel.menu_item_id || '');
              if (course === 'starter') starters.push(`${label}: ${name}`);
              else if (course === 'main') mains.push(`${label}: ${name}`);
              else if (course === 'dessert') desserts.push(`${label}: ${name}`);
            });
          } else {
            if (person.starter) starters.push(`${label}: ${cleanName(person.starter)}`);
            if (person.main) mains.push(`${label}: ${cleanName(person.main)}`);
            if (person.dessert) desserts.push(`${label}: ${cleanName(person.dessert)}`);
          }
        });

        const renderList = (title, items) => {
          doc.font('Helvetica-Bold').text(title).moveDown(0.3);
          doc.font('Helvetica');
          if (items.length === 0) { doc.text('—').moveDown(); return; }
          items.forEach(i => doc.text(`• ${i}`));
          doc.moveDown();
        };

        renderList('Starters', starters);
        renderList('Mains', mains);
        renderList('Desserts', desserts);
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
    const useResend = !!RESEND_API_KEY;
    const subject = `Preorder for ${bookingData.firstName} ${bookingData.lastName} - ${bookingData.date}`;
    const text = `New booking with preorder details attached.\n\nBooking Details:\nDate: ${bookingData.date}\nTime: ${bookingData.time}\nParty Size: ${bookingData.partySize}\nCustomer: ${bookingData.firstName} ${bookingData.lastName}\nEmail: ${bookingData.email}\nPhone: ${bookingData.phone}`;

    if (useResend) {
        const fs = require('fs');
        const content = fs.readFileSync(pdfPath).toString('base64');
        const result = await sendEmailViaResend({
            from: process.env.EMAIL_FROM || 'Scenic Inn <noreply@scenic-inn.dev>',
            to: process.env.RESTAURANT_EMAIL || process.env.EMAIL_USER,
            subject,
            text,
            attachments: [{ filename: `preorder-${bookingData.date}-${bookingData.lastName}.pdf`, content }]
        });
        return { success: true, provider: 'resend', id: result.id };
    }

    const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: process.env.RESTAURANT_EMAIL || 'restaurant@thescenicinn.com',
        subject,
        text,
        attachments: [
            {
                filename: `preorder-${bookingData.date}-${bookingData.lastName}.pdf`,
                path: pdfPath
            }
        ]
    };
    const info = await emailTransporter.sendMail(mailOptions);
    return { success: true, provider: 'smtp', messageId: info.messageId };
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
      console.log('Preorder people count:', Array.isArray(preorderData) ? preorderData.length : 0);
        
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
              console.log('Preorder email result:', preorderResult);
                
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
            if (RESEND_API_KEY) {
                const firstName = (bookingData.firstName || bookingData.first_name || '').toString().trim();
                await sendEmailViaResend({
                    from: process.env.EMAIL_FROM || 'Scenic Inn <noreply@scenic-inn.dev>',
                    to: bookingData.email,
                    subject: `Booking Confirmation - The Scenic Inn`,
                    text: `Dear ${firstName || 'guest'},\n\nThank you for your booking at The Scenic Inn.\n\nBooking Details:\nDate: ${bookingData.date}\nTime: ${bookingData.time}\nParty Size: ${bookingData.partySize} people\n\nWe look forward to seeing you!\n\nBest regards,\nThe Scenic Inn Team`
                });
            } else {
                const verify = await verifyTransporter();
                if (!verify.ok) {
                    console.warn('Email transporter not verified, continuing but email may fail');
                }
                const customerEmail = {
                    from: process.env.EMAIL_USER || 'your-email@gmail.com',
                    to: bookingData.email,
                    subject: `Booking Confirmation - The Scenic Inn`,
                    text: `Dear ${(bookingData.firstName || bookingData.first_name || 'guest')},\n\nThank you for your booking at The Scenic Inn.\n\nBooking Details:\nDate: ${bookingData.date}\nTime: ${bookingData.time}\nParty Size: ${bookingData.partySize} people\n\nWe look forward to seeing you!\n\nBest regards,\nThe Scenic Inn Team`
                };
                await emailTransporter.sendMail(customerEmail);
            }
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

// Diagnostic endpoints (safe):
// 1) GET /api/booking-submission/test-email?to=address
// Sends a simple email to confirm SMTP works
router.get('/test-email', async (req, res) => {
    const to = req.query.to || process.env.RESTAURANT_EMAIL || process.env.EMAIL_USER;
    try {
        if (RESEND_API_KEY) {
            const data = await sendEmailViaResend({
                from: process.env.EMAIL_FROM || 'Scenic Inn <onboarding@resend.dev>',
                to,
                subject: 'Scenic Inn email test (Resend)',
                text: 'This is a test email sent via Resend HTTPS API.'
            });
            return res.json({ success: true, provider: 'resend', id: data.id, to });
        }
        // Fallback to SMTP test
        const verify = await verifyTransporter();
        if (!verify.ok) return res.status(500).json({ success: false, stage: 'verify', error: verify.error });
        const info = await emailTransporter.sendMail({ from: process.env.EMAIL_USER, to, subject: 'Scenic Inn SMTP test', text: 'SMTP test email.' });
        res.json({ success: true, provider: 'smtp', messageId: info.messageId, to });
    } catch (e) {
        console.error('SMTP test failed:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});
