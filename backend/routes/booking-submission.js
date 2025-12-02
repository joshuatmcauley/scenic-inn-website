// Booking submission system - sends basic details to Dojo and handles preorders
const express = require('express');
const router = express.Router();
const axios = require('axios');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import database helpers to fetch menu item details
const { dbHelpers } = require('../database-production');

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
    
    try {
        console.log(`[Resend] Sending email from ${from} to ${to}`);
        const res = await axios.post('https://api.resend.com/emails', payload, {
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            timeout: 15000
        });
        console.log(`[Resend] Email sent successfully. ID: ${res.data.id}`);
        return res.data;
    } catch (error) {
        // Log detailed error information
        if (error.response) {
            console.error('[Resend] API Error Response:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
            throw new Error(`Resend API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            console.error('[Resend] No response received:', error.request);
            throw new Error('Resend API: No response received');
        } else {
            console.error('[Resend] Error setting up request:', error.message);
            throw error;
        }
    }
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
async function generatePreorderPDF(bookingData, preorderData) {
    return new Promise(async (resolve, reject) => {
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
      const specialRequests = pick(bookingData, ['specialRequests', 'special_requests'], '');
      const experienceId = pick(bookingData, ['experience_id'], '');

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
            if (specialRequests && specialRequests.trim()) {
                doc.fontSize(14)
                   .text('Special Requests:', { underline: true })
                   .fontSize(12)
                   .text(specialRequests, { 
                     width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
                     align: 'left'
                   })
                   .moveDown();
            }
            
      // Preorder Details (grouped lists)
            if (preorderData && preorderData.length > 0) {
                doc.fontSize(14)
                   .text('Preorder Menu Selections:', { underline: true })
                   .moveDown();
                
        // Check if this is a buffet menu (buffet items don't have course_type)
        const isBuffetMenu = experienceId === 'buffet';
        
        if (isBuffetMenu) {
          // For buffet, collect all items with quantities
          const buffetItems = new Map(); // item name -> total quantity
          
          for (const person of preorderData) {
            if (person.items && Array.isArray(person.items)) {
              for (const sel of person.items) {
                let itemName = '';
                const quantity = sel.quantity || 1;
                
                // Try to get item name from various sources
                if (sel.item_name) {
                  itemName = cleanName(sel.item_name);
                } else if (sel.name) {
                  itemName = cleanName(sel.name);
                } else if (sel.menu_item_id) {
                  // Fetch item name from database
                  try {
                    const item = await dbHelpers.getMenuItemById(sel.menu_item_id);
                    if (item) {
                      itemName = cleanName(item.name);
                    } else {
                      itemName = sel.menu_item_id; // Fallback to ID
                    }
                  } catch (err) {
                    console.error('Error fetching menu item:', err);
                    itemName = sel.menu_item_id; // Fallback to ID
                  }
                }
                
                if (itemName) {
                  const currentQty = buffetItems.get(itemName) || 0;
                  buffetItems.set(itemName, currentQty + quantity);
                }
              }
            }
          }
          
          // Display buffet items in a simple list
          if (buffetItems.size > 0) {
            doc.font('Helvetica-Bold').fontSize(12).text('Buffet Items:').moveDown(0.3);
            doc.font('Helvetica').fontSize(10);
            
            const x0 = doc.x;
            const itemW = 300;
            const qtyW = 80;
            
            // Header
            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('Item', x0, doc.y, { width: itemW });
            doc.text('Quantity', x0 + itemW, doc.y, { width: qtyW });
            doc.moveDown(0.2);
            
            // Draw line
            doc.lineWidth(0.5);
            const lineY = doc.y;
            doc.moveTo(x0, lineY).lineTo(x0 + itemW + qtyW, lineY).stroke();
            doc.moveDown(0.2);
            
            // Items
            doc.font('Helvetica').fontSize(10);
            for (const [itemName, quantity] of buffetItems.entries()) {
              doc.text(itemName, x0, doc.y, { width: itemW });
              doc.text(`${quantity}x`, x0 + itemW, doc.y, { width: qtyW });
              doc.moveDown(0.3);
            }
          }
        } else {
          // Regular menu with course types
          const starters = [];
          const mains = [];
          const sides = [];
          const desserts = [];

          for (const person of preorderData) {
            const personNumber = person.person_number || 1;
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
              for (const sel of person.items) {
                const course = (sel.course_type || '').toLowerCase();
                let name = '';
                
                // Try to get item name
                if (sel.item_name) {
                  name = cleanName(sel.item_name);
                } else if (sel.name) {
                  name = cleanName(sel.name);
                } else if (sel.menu_item_id) {
                  // Fetch item name from database
                  try {
                    const item = await dbHelpers.getMenuItemById(sel.menu_item_id);
                    if (item) {
                      name = cleanName(item.name);
                    } else {
                      name = sel.menu_item_id; // Fallback to ID
                    }
                  } catch (err) {
                    console.error('Error fetching menu item:', err);
                    name = sel.menu_item_id; // Fallback to ID
                  }
                }
                
                if (course === 'starter') personStarter = name;
                else if (course === 'main') personMain = name;
                else if (course === 'side') personSide = name;
                else if (course === 'dessert') personDessert = name;
              }
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
          }

        // Draw table with Person, Item, Sides, Notes columns
        const drawTable = (title, items, showSides = false) => {
          if (items.length === 0) return; // Don't draw empty tables
          
          // Sort items by item name to group identical items together
          items.sort((a, b) => {
            const itemA = typeof a === 'object' ? a.item : a.replace(/^Person \d+:\s*/, '').replace(/\s*-\s*£.*$/,'');
            const itemB = typeof b === 'object' ? b.item : b.replace(/^Person \d+:\s*/, '').replace(/\s*-\s*£.*$/,'');
            return itemA.localeCompare(itemB);
          });
          
          const x0 = doc.page.margins.left;
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
          
          // Calculate total table height BEFORE drawing
          const totalHeight = headerH + rowHeights.reduce((sum, h) => sum + h, 0);
          const titleHeight = 15; // Space for title
          const spacingAfter = 10; // Space after table
          const totalNeeded = titleHeight + totalHeight + spacingAfter;
          
          // Check if we need a new page BEFORE drawing
          const availableSpace = doc.page.height - doc.y - doc.page.margins.bottom;
          if (availableSpace < totalNeeded) {
            doc.addPage();
            y = doc.page.margins.top;
            doc.y = y;
          } else {
            y = doc.y;
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
          
          // Update doc.y to position after the table
          doc.y = y + totalHeight + spacingAfter;
          doc.fontSize(12); // Reset font size
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
            // drawTable now handles page breaks internally, so we just need to add the title
            doc.font('Helvetica-Bold').fontSize(14).text('Desserts').moveDown(0.2);
            drawTable('Desserts', desserts);
          }
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

// Send email with PDF attachment (restaurant preorder email)
async function sendPreorderEmail(pdfPath, bookingData) {
    try {
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
        const specialRequests = pick(bookingData, ['specialRequests', 'special_requests'], '');
        
        const subject = `Preorder for ${fullName} - ${date}`;
        let text = `New booking with preorder details attached.\n\nBooking Details:\nDate: ${date}\nTime: ${time}\nParty Size: ${partySize}\nCustomer: ${fullName}\nEmail: ${email}\nPhone: ${phone}`;
        
        // Add special requests if provided
        if (specialRequests && specialRequests.trim()) {
            text += `\n\nSpecial Requests:\n${specialRequests}`;
        }

        const toAddress = process.env.RESTAURANT_EMAIL || process.env.EMAIL_USER;
        const fromAddress = process.env.EMAIL_FROM || 'Scenic Inn <noreply@scenic-inn.dev>';

        if (!toAddress) {
            throw new Error('No restaurant email address configured. Please set RESTAURANT_EMAIL or EMAIL_USER environment variable.');
        }

        console.log(`[sendPreorderEmail] Using ${useResend ? 'Resend' : 'SMTP'}`);
        console.log(`[sendPreorderEmail] From: ${fromAddress}`);
        console.log(`[sendPreorderEmail] To: ${toAddress}`);

        if (useResend) {
            const fs = require('fs');
            const content = fs.readFileSync(pdfPath).toString('base64');
            const result = await sendEmailViaResend({
                from: fromAddress,
                to: toAddress,
                subject,
                text,
                attachments: [{ filename: `preorder-${date}-${lastName || 'booking'}.pdf`, content }]
            });
            console.log(`[sendPreorderEmail] ✅ Email sent via Resend. ID: ${result.id}`);
            return { success: true, provider: 'resend', id: result.id };
        }

        // Verify SMTP transporter before using
        const verify = await verifyTransporter();
        if (!verify.ok) {
            throw new Error(`SMTP transporter verification failed: ${verify.error}`);
        }

        const mailOptions = {
            from: process.env.EMAIL_USER || 'your-email@gmail.com',
            to: toAddress,
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
        console.log(`[sendPreorderEmail] ✅ Email sent via SMTP. Message ID: ${info.messageId}`);
        return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (error) {
        console.error('[sendPreorderEmail] ❌ ERROR:', error.message);
        console.error('[sendPreorderEmail] Stack:', error.stack);
        throw error; // Re-throw so caller can handle it
    }
}

// Send a simple booking notification email to the restaurant (no preorder / no PDF)
async function sendRestaurantBookingEmail(bookingData, hasPreorder = false) {
    try {
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
        const specialRequests = pick(bookingData, ['specialRequests', 'special_requests'], '');

        const subject = hasPreorder
            ? `New booking (with preorder) - ${date}`
            : `New booking - ${date}`;

        let text = `New booking received.\n\nBooking Details:\nDate: ${date}\nTime: ${time}\nParty Size: ${partySize}\nCustomer: ${fullName}\nEmail: ${email}\nPhone: ${phone}`;

        if (specialRequests && specialRequests.trim()) {
            text += `\n\nSpecial Requests:\n${specialRequests}`;
        }

        if (hasPreorder) {
            text += `\n\nPreorder: Customer has submitted a preorder. See preorder PDF / system for full details.`;
        } else {
            text += `\n\nPreorder: No preorder submitted. Customer will order on the day.`;
        }

        const toAddress = process.env.RESTAURANT_EMAIL || process.env.EMAIL_USER;
        const fromAddress = process.env.EMAIL_FROM || 'Scenic Inn <noreply@scenic-inn.dev>';

        if (!toAddress) {
            throw new Error('No restaurant email address configured. Please set RESTAURANT_EMAIL or EMAIL_USER environment variable.');
        }

        console.log(`[sendRestaurantBookingEmail] Using ${useResend ? 'Resend' : 'SMTP'}`);
        console.log(`[sendRestaurantBookingEmail] From: ${fromAddress}`);
        console.log(`[sendRestaurantBookingEmail] To: ${toAddress}`);

        if (useResend) {
            const result = await sendEmailViaResend({
                from: fromAddress,
                to: toAddress,
                subject,
                text
            });
            console.log(`[sendRestaurantBookingEmail] ✅ Email sent via Resend. ID: ${result.id}`);
            return { success: true, provider: 'resend', id: result.id };
        }

        // Verify SMTP transporter before using
        const verify = await verifyTransporter();
        if (!verify.ok) {
            throw new Error(`SMTP transporter verification failed: ${verify.error}`);
        }

        const mailOptions = {
            from: process.env.EMAIL_USER || 'your-email@gmail.com',
            to: toAddress,
            subject,
            text
        };

        const info = await emailTransporter.sendMail(mailOptions);
        console.log(`[sendRestaurantBookingEmail] ✅ Email sent via SMTP. Message ID: ${info.messageId}`);
        return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (error) {
        console.error('[sendRestaurantBookingEmail] ❌ ERROR:', error.message);
        console.error('[sendRestaurantBookingEmail] Stack:', error.stack);
        throw error; // Re-throw so caller can handle it
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
        
        console.log('=== BOOKING SUBMISSION RECEIVED ===');
        console.log('Raw request body keys:', Object.keys(req.body));
        console.log('bookingData:', JSON.stringify(bookingData, null, 2));
        console.log('Preorder people count:', Array.isArray(preorderData) ? preorderData.length : 0);
        
        // Email configuration diagnostics
        console.log('=== EMAIL CONFIGURATION ===');
        console.log('RESEND_API_KEY:', RESEND_API_KEY ? '✅ Set (' + RESEND_API_KEY.substring(0, 10) + '...)' : '❌ NOT SET');
        console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '❌ NOT SET');
        console.log('RESTAURANT_EMAIL:', process.env.RESTAURANT_EMAIL || '❌ NOT SET');
        console.log('EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
        console.log('Email provider will be:', RESEND_API_KEY ? 'Resend' : 'SMTP');
        
        // Step 1: Dojo API integration not available
        const dojoResult = { 
            success: false, 
            reason: 'Dojo API access not available for this account',
            note: 'Current booking system working perfectly - no external integration needed'
        };
        
        // Step 2: Handle preorder if present (and always send restaurant booking email)
        let preorderResult = null;
        console.log('=== PREORDER CHECK ===');
        console.log('preorderData:', JSON.stringify(preorderData, null, 2));
        console.log('preorderData type:', typeof preorderData);
        console.log('preorderData is array:', Array.isArray(preorderData));
        console.log('preorderData length:', preorderData ? preorderData.length : 0);
        
        if (preorderData && preorderData.length > 0) {
            console.log('✅ Preorder data found, generating PDF...');
            try {
                // Generate PDF
                const pdfPath = await generatePreorderPDF(bookingData, preorderData);
                console.log('✅ PDF generated at:', pdfPath);

                // Send email with PDF (restaurant preorder email)
                console.log('📧 Sending restaurant email with PDF (preorder)...');
                console.log('   To:', process.env.RESTAURANT_EMAIL || process.env.EMAIL_USER);
                console.log('   From:', process.env.EMAIL_FROM || 'Scenic Inn <noreply@scenic-inn.dev>');
                try {
                    preorderResult = await sendPreorderEmail(pdfPath, bookingData);
                    console.log('✅ Preorder email result:', JSON.stringify(preorderResult, null, 2));
                } catch (emailError) {
                    console.error('❌ CRITICAL: Failed to send preorder email with PDF');
                    console.error('   Error:', emailError.message);
                    console.error('   Stack:', emailError.stack);
                    preorderResult = { success: false, error: emailError.message };
                    // Don't throw - continue to try sending the summary email
                }

                // Also send a plain booking notification email (makes behaviour consistent)
                try {
                    console.log('📧 Sending restaurant booking summary email (with preorder flag)...');
                    const bookingEmailResult = await sendRestaurantBookingEmail(bookingData, true);
                    console.log('✅ Restaurant booking summary email result:', JSON.stringify(bookingEmailResult, null, 2));
                } catch (emailErr) {
                    console.error('❌ Failed to send restaurant booking summary email (with preorder)');
                    console.error('   Error:', emailErr.message);
                    console.error('   Stack:', emailErr.stack);
                    // Don't throw - we've already tried to send the preorder email
                }

                // Clean up PDF file after sending
                setTimeout(() => {
                    if (fs.existsSync(pdfPath)) {
                        fs.unlinkSync(pdfPath);
                    }
                }, 5000);

            } catch (error) {
                console.error('❌ Error handling preorder:', error);
                console.error('   Error message:', error.message);
                console.error('   Error stack:', error.stack);
                preorderResult = { success: false, error: error.message };
            }
        } else {
            console.warn('⚠️ No preorder data found - skipping PDF generation');
            console.warn('   Sending basic restaurant booking email without preorder.');
            try {
                const bookingEmailResult = await sendRestaurantBookingEmail(bookingData, false);
                console.log('✅ Restaurant booking email (no preorder) result:', JSON.stringify(bookingEmailResult, null, 2));
                preorderResult = bookingEmailResult;
            } catch (emailErr) {
                console.error('❌ CRITICAL: Failed to send restaurant booking email (no preorder)');
                console.error('   Error:', emailErr.message);
                console.error('   Stack:', emailErr.stack);
                preorderResult = { success: false, error: emailErr.message };
            }
        }
        
        // Step 3: Store booking in database
        let savedBooking = null;
        try {
            const bookingReference = `SCENIC-${Date.now()}`;
            const bookingToSave = {
                ...bookingData,
                bookingReference,
                preorder: preorderData && preorderData.length > 0 ? preorderData : null
            };
            savedBooking = await dbHelpers.createBooking(bookingToSave);
            console.log('✅ Booking saved to database:', savedBooking.id);
        } catch (dbError) {
            console.error('❌ Error saving booking to database:', dbError);
            // Don't fail the booking if database save fails
        }
        
        // Step 4: Send confirmation email to customer
        try {
            // Debug: Log the entire booking data to see what we're working with
            console.log('=== CUSTOMER EMAIL DEBUG ===');
            console.log('Full bookingData:', JSON.stringify(bookingData, null, 2));
            console.log('bookingData.email:', bookingData.email);
            console.log('bookingData.contactEmail:', bookingData.contactEmail);
            console.log('bookingData.contact_email:', bookingData.contact_email);
            
            // Extract customer email from booking data (support multiple field names)
            const customerEmail = bookingData.email || bookingData.contactEmail || bookingData.contact_email;
            
            console.log('Extracted customerEmail:', customerEmail);
            
            if (!customerEmail) {
                console.warn('❌ No customer email found in booking data, skipping confirmation email');
                console.log('Booking data keys:', Object.keys(bookingData));
            } else {
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(customerEmail)) {
                    console.warn(`❌ Invalid email format: ${customerEmail}, skipping confirmation email`);
                } else {
                    console.log(`✅ Sending confirmation email to customer: ${customerEmail}`);
                    
                    if (RESEND_API_KEY) {
                        const firstName = (bookingData.firstName || bookingData.first_name || '').toString().trim();
                        const emailFrom = process.env.EMAIL_FROM || 'Scenic Inn <noreply@scenic-inn.dev>';
                        
                        console.log(`📧 Confirmation email details:`);
                        console.log(`   From: ${emailFrom}`);
                        console.log(`   To: ${customerEmail}`);
                        console.log(`   Subject: Booking Confirmation - The Scenic Inn`);
                        
                        try {
                            const result = await sendEmailViaResend({
                                from: emailFrom,
                                to: customerEmail, // Use extracted customer email
                                subject: `Booking Confirmation - The Scenic Inn`,
                                text: `Dear ${firstName || 'guest'},\n\nThank you for your booking at The Scenic Inn.\n\nBooking Details:\nDate: ${bookingData.date}\nTime: ${bookingData.time}\nParty Size: ${bookingData.partySize || bookingData.party_size} people\n\nWe look forward to seeing you!\n\nBest regards,\nThe Scenic Inn Team`
                            });
                            console.log(`✅ Confirmation email sent successfully to ${customerEmail}`);
                            console.log(`   Resend Email ID: ${result.id}`);
                            console.log(`   Check Resend dashboard: https://resend.com/emails/${result.id}`);
                        } catch (emailError) {
                            console.error(`❌ FAILED to send confirmation email to ${customerEmail}`);
                            console.error(`   Error:`, emailError.message);
                            if (emailError.response) {
                                console.error(`   Status: ${emailError.response.status}`);
                                console.error(`   Response Data:`, JSON.stringify(emailError.response.data, null, 2));
                            }
                            // Don't throw - we don't want to fail the booking if email fails
                            // But log it clearly so we can see the issue
                        }
                    } else {
                        const verify = await verifyTransporter();
                        if (!verify.ok) {
                            console.warn('Email transporter not verified, continuing but email may fail');
                        }
                        const emailOptions = {
                            from: process.env.EMAIL_USER || 'your-email@gmail.com',
                            to: customerEmail, // Use extracted customer email
                            subject: `Booking Confirmation - The Scenic Inn`,
                            text: `Dear ${(bookingData.firstName || bookingData.first_name || 'guest')},\n\nThank you for your booking at The Scenic Inn.\n\nBooking Details:\nDate: ${bookingData.date}\nTime: ${bookingData.time}\nParty Size: ${bookingData.partySize || bookingData.party_size} people\n\nWe look forward to seeing you!\n\nBest regards,\nThe Scenic Inn Team`
                        };
                        await emailTransporter.sendMail(emailOptions);
                        console.log(`Confirmation email sent successfully to ${customerEmail}`);
                    }
                }
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
            bookingReference: savedBooking?.booking_reference || `SCENIC-${Date.now()}`,
            bookingId: savedBooking?.id || null,
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
