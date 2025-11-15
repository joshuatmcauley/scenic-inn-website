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
          const personName = person.person_name || null;
          const personNotes = person.special_instructions || '';
          
          // Format person identifier: only show name if available, otherwise empty string
          const personLabel = personName ? personName : '';
          
          // Collect items by person to match sides with mains
          let personStarter = null;
          let personMain = null;
          let personSide = null;
          let personDessert = null;
          
          if (person.items && Array.isArray(person.items)) {
            person.items.forEach(sel => {
              const course = (sel.course_type || '').toLowerCase();
              const name = cleanName(sel.item_name || sel.name || sel.menu_item_id || '');
              if (course === 'starter') personStarter = name;
              else if (course === 'main') personMain = name;
              else if (course === 'side') personSide = name;
              else if (course === 'dessert') personDessert = name;
            });
          } else {
            if (person.starter) personStarter = cleanName(person.starter);
            if (person.main) personMain = cleanName(person.main);
            if (person.side) personSide = cleanName(person.side);
            if (person.dessert) personDessert = cleanName(person.dessert);
          }
          
          // Add to arrays with side matched to main
          if (personStarter) starters.push({ person: personLabel, item: personStarter, notes: personNotes });
          if (personMain) mains.push({ person: personLabel, item: personMain, side: personSide, notes: personNotes });
          if (personDessert) desserts.push({ person: personLabel, item: personDessert, notes: personNotes });
        });

        // Draw table with Person, Item, Sides, Notes columns
        const drawTable = (title, items, showSides = false) => {
          if (items.length === 0) return; // Don't draw empty tables
          
          // Sort items by item name to group identical items together
          items.sort((a, b) => {
            const itemA = typeof a === 'object' ? a.item : a.replace(/^Person \d+:\s*/, '').replace(/\s*-\s*£.*$/,'');
            const itemB = typeof b === 'object' ? b.item : b.replace(/^Person \d+:\s*/, '').replace(/\s*-\s*£.*$/,'');
            return itemA.localeCompare(itemB);
          });
          
          const x0 = doc.x;
          let y = doc.y;
          const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
          const personW = 60;
          const sidesW = showSides ? 100 : 0;
          const notesW = 100; // Increased notes width for better wrapping
          const itemW = totalW - personW - sidesW - notesW; // Item gets remaining space
          const minRowH = 12; // Minimum row height
          const cellPadding = 3;
          const fontSize = 8;
          
          // Set font for height calculations
          doc.font('Helvetica').fontSize(fontSize);
          
          // Calculate row heights first by measuring text
          const rowHeights = [];
          const headerH = 12; // Header row height
          
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const personText = typeof item === 'object' ? (item.person || '') : '';
            const itemName = typeof item === 'object' ? item.item : item.replace(/^Person \d+:\s*/, '').replace(/\s*-\s*£.*$/,'');
            const sideName = typeof item === 'object' ? (item.side || '') : '';
            const notes = typeof item === 'object' ? (item.notes || '') : '';
            
            // Calculate height needed for each cell
            const personHeight = doc.heightOfString(personText || '', { width: personW - cellPadding * 2 });
            const itemHeight = doc.heightOfString(itemName || '', { width: itemW - cellPadding * 2 });
            const sideHeight = showSides ? doc.heightOfString(sideName || '', { width: sidesW - cellPadding * 2 }) : 0;
            const notesHeight = doc.heightOfString(notes || '', { width: notesW - cellPadding * 2 });
            
            // Row height is the maximum of all cell heights
            const rowH = Math.max(minRowH, personHeight, itemHeight, sideHeight, notesHeight) + 4; // +4 for padding
            rowHeights.push(rowH);
          }
          
          // Draw header
          doc.font('Helvetica-Bold').fontSize(9);
          const headerY = y + 2;
          doc.text('Person', x0 + cellPadding, headerY, { width: personW - cellPadding * 2 });
          doc.text('Item', x0 + personW + cellPadding, headerY, { width: itemW - cellPadding * 2 });
          if (showSides) {
            doc.text('Sides', x0 + personW + itemW + cellPadding, headerY, { width: sidesW - cellPadding * 2 });
          }
          doc.text('Notes', x0 + personW + itemW + sidesW + cellPadding, headerY, { width: notesW - cellPadding * 2 });
          
          // Calculate total table height
          const totalHeight = headerH + rowHeights.reduce((sum, h) => sum + h, 0);
          
          // Draw grid lines
          doc.lineWidth(0.5);
          // Horizontal lines
          let currentY = y;
          doc.moveTo(x0, currentY).lineTo(x0 + totalW, currentY).stroke(); // Top border
          currentY += headerH;
          doc.moveTo(x0, currentY).lineTo(x0 + totalW, currentY).stroke(); // Header bottom
          for (let i = 0; i < rowHeights.length; i++) {
            currentY += rowHeights[i];
            doc.moveTo(x0, currentY).lineTo(x0 + totalW, currentY).stroke();
          }
          // Vertical borders
          doc.moveTo(x0, y).lineTo(x0, y + totalHeight).stroke(); // Left
          doc.moveTo(x0 + personW, y).lineTo(x0 + personW, y + totalHeight).stroke();
          doc.moveTo(x0 + personW + itemW, y).lineTo(x0 + personW + itemW, y + totalHeight).stroke();
          if (showSides) {
            doc.moveTo(x0 + personW + itemW + sidesW, y).lineTo(x0 + personW + itemW + sidesW, y + totalHeight).stroke();
          }
          doc.moveTo(x0 + totalW, y).lineTo(x0 + totalW, y + totalHeight).stroke(); // Right
          
          // Fill body with text that wraps
          doc.font('Helvetica').fontSize(fontSize);
          currentY = y + headerH + 2;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const personText = typeof item === 'object' ? (item.person || '') : '';
            const itemName = typeof item === 'object' ? item.item : item.replace(/^Person \d+:\s*/, '').replace(/\s*-\s*£.*$/,'');
            const sideName = typeof item === 'object' ? (item.side || '') : '';
            const notes = typeof item === 'object' ? (item.notes || '') : '';
            
            // Center text vertically in row
            const rowH = rowHeights[i];
            const textY = currentY + (rowH - doc.heightOfString(personText || 'A', { width: personW - cellPadding * 2 })) / 2;
            
            doc.text(personText, x0 + cellPadding, textY, { width: personW - cellPadding * 2, align: 'left' });
            doc.text(itemName, x0 + personW + cellPadding, textY, { width: itemW - cellPadding * 2, align: 'left' });
            if (showSides) {
              doc.text(sideName, x0 + personW + itemW + cellPadding, textY, { width: sidesW - cellPadding * 2, align: 'left' });
            }
            doc.text(notes, x0 + personW + itemW + sidesW + cellPadding, textY, { width: notesW - cellPadding * 2, align: 'left' });
            
            currentY += rowH;
          }
          
          doc.fontSize(12); // Reset font size
          doc.moveDown(totalHeight / 14 + 0.3); // advance roughly table height + spacing
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

        // Sides are now included in the mains table, no separate table needed
        
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
    
    // Normalize fields to prevent undefined values
    const firstName = pick(bookingData, ['firstName', 'first_name', 'firstname'], '');
    const lastName = pick(bookingData, ['lastName', 'last_name', 'lastname'], '');
    const fullName = `${firstName} ${lastName}`.trim() || 'N/A';
    const partySize = pick(bookingData, ['partySize', 'party_size'], 'N/A');
    const email = pick(bookingData, ['email', 'contactEmail', 'contact_email'], 'N/A');
    const phone = pick(bookingData, ['phone', 'contactPhone', 'contact_phone'], 'N/A');
    const date = pick(bookingData, ['date'], 'N/A');
    const time = pick(bookingData, ['time'], 'N/A');
    
    const subject = `Preorder for ${fullName} - ${date}`;
    const text = `New booking with preorder details attached.\n\nBooking Details:\nDate: ${date}\nTime: ${time}\nParty Size: ${partySize}\nCustomer: ${fullName}\nEmail: ${email}\nPhone: ${phone}`;

    if (useResend) {
        const fs = require('fs');
        const content = fs.readFileSync(pdfPath).toString('base64');
        const result = await sendEmailViaResend({
            from: process.env.EMAIL_FROM || 'Scenic Inn <noreply@scenic-inn.dev>',
            to: process.env.RESTAURANT_EMAIL || process.env.EMAIL_USER,
            subject,
            text,
            attachments: [{ filename: `preorder-${date}-${lastName || 'booking'}.pdf`, content }]
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
                filename: `preorder-${date}-${lastName || 'booking'}.pdf`,
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
