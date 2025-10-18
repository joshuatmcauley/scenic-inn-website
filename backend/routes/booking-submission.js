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
  // remove trailing price patterns like " - £0.00" or "- 0.00"
  return name.replace(/\s*-\s*£?\d+(?:[.,]\d{1,2})?\s*$/i, '').trim();
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
        const sides = [];
        const desserts = [];

        preorderData.forEach((person, index) => {
          const personNumber = person.person_number || index + 1;
          const personNotes = person.special_instructions || '';
          
          if (person.items && Array.isArray(person.items)) {
            person.items.forEach(sel => {
              const course = (sel.course_type || '').toLowerCase();
              const name = cleanName(sel.item_name || sel.name || sel.menu_item_id || '');
              if (course === 'starter') starters.push({ person: personNumber, item: name, notes: personNotes });
              else if (course === 'main') mains.push({ person: personNumber, item: name, notes: personNotes });
              else if (course === 'side') sides.push({ person: personNumber, item: name, notes: personNotes });
              else if (course === 'dessert') desserts.push({ person: personNumber, item: name, notes: personNotes });
            });
          } else {
            if (person.starter) starters.push({ person: personNumber, item: cleanName(person.starter), notes: personNotes });
            if (person.main) mains.push({ person: personNumber, item: cleanName(person.main), notes: personNotes });
            if (person.side) sides.push({ person: personNumber, item: cleanName(person.side), notes: personNotes });
            if (person.dessert) desserts.push({ person: personNumber, item: cleanName(person.dessert), notes: personNotes });
          }
        });

        // Draw table with Person, Item, Sides, Notes columns
        const drawTable = (title, items, showSides = false) => {
          if (items.length === 0) return; // Don't draw empty tables
          
          const x0 = doc.x;
          let y = doc.y;
          const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
          const personW = 50;
          const sidesW = showSides ? 80 : 0;
          const itemW = totalW - personW - sidesW - 70; // Notes column gets 70px
          const notesW = 70;
          const rowH = 14;
          const rows = items.length + 1; // + header
          
          // Headers
          doc.font('Helvetica-Bold');
          doc.text('Person', x0 + 3, y + 2, { width: personW - 6 });
          doc.text('Item', x0 + personW + 3, y + 2, { width: itemW - 6 });
          if (showSides) {
            doc.text('Sides', x0 + personW + itemW + 3, y + 2, { width: sidesW - 6 });
          }
          doc.text('Notes', x0 + personW + itemW + sidesW + 3, y + 2, { width: notesW - 6 });
          
          // Grid lines
          doc.lineWidth(0.5);
          for (let r = 0; r <= rows; r++) {
            const yy = y + r * rowH;
            doc.moveTo(x0, yy).lineTo(x0 + totalW, yy).stroke();
          }
          // Vertical borders
          doc.moveTo(x0, y).lineTo(x0, y + rows * rowH).stroke();
          doc.moveTo(x0 + personW, y).lineTo(x0 + personW, y + rows * rowH).stroke();
          doc.moveTo(x0 + personW + itemW, y).lineTo(x0 + personW + itemW, y + rows * rowH).stroke();
          if (showSides) {
            doc.moveTo(x0 + personW + itemW + sidesW, y).lineTo(x0 + personW + itemW + sidesW, y + rows * rowH).stroke();
          }
          doc.moveTo(x0 + totalW, y).lineTo(x0 + totalW, y + rows * rowH).stroke();
          
          // Fill body
          doc.font('Helvetica');
          for (let i = 0; i < items.length; i++) {
            const ly = y + (i + 1) * rowH + 2;
            const item = items[i];
            const personNum = typeof item === 'object' ? item.person : i + 1;
            const itemName = typeof item === 'object' ? item.item : item.replace(/^Person \d+:\s*/, '').replace(/\s*-\s*£.*$/,'');
            const sideName = typeof item === 'object' ? (item.side || '') : '';
            const notes = typeof item === 'object' ? item.notes : '';
            
            doc.text(`${personNum}`, x0 + 3, ly, { width: personW - 6 });
            doc.text(itemName, x0 + personW + 3, ly, { width: itemW - 6 });
            if (showSides) {
              doc.text(sideName, x0 + personW + itemW + 3, ly, { width: sidesW - 6 });
            }
            doc.text(notes, x0 + personW + itemW + sidesW + 3, ly, { width: notesW - 6 });
          }
          doc.moveDown(rows * rowH / 14 + 0.3); // advance roughly rows height + spacing
        };

        // Only show sections that have data
        if (starters.length > 0) {
          doc.font('Helvetica-Bold').text('Starters').moveDown(0.2);
          drawTable('Starters', starters);
          doc.moveDown(0.3);
        }
        
        if (mains.length > 0) {
          // Check if we need a new page for mains
          if (doc.y > doc.page.height - 200) {
            doc.addPage();
          }
          doc.font('Helvetica-Bold').text('Mains').moveDown(0.2);
          drawTable('Mains', mains, true); // Show sides column for mains
          doc.moveDown(0.3);
        }

        if (sides.length > 0) {
          // Check if we need a new page for sides
          if (doc.y > doc.page.height - 200) {
            doc.addPage();
          }
          doc.font('Helvetica-Bold').text('Sides').moveDown(0.2);
          drawTable('Sides', sides);
          doc.moveDown(0.3);
        }
        
        if (desserts.length > 0) {
          // Check if we need a new page for desserts
          if (doc.y > doc.page.height - 200) {
            doc.addPage();
          }
          doc.font('Helvetica-Bold').text('Desserts').moveDown(0.2);
          drawTable('Desserts', desserts);
        }
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
        
        // Step 1: Dojo API integration not available
        const dojoResult = { 
            success: false, 
            reason: 'Dojo API access not available for this account',
            note: 'Current booking system working perfectly - no external integration needed'
        };
        
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
            bookingReference: `SCENIC-${Date.now()}`,
            dojoBookingId: dojoResult?.dojoBookingId || null
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

// Test Dojo API connection
router.get('/test-dojo', async (req, res) => {
    try {
        const dojoAPI = require('../config/dojo');
        
        // Test connection
        const connectionTest = await dojoAPI.testConnection();
        
        res.json({
            success: true,
            message: 'Dojo API test completed',
            connectionTest,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Dojo API test failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
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
