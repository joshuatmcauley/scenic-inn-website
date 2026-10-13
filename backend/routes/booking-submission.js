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

// Generate the kitchen PDF for a preorder: logo, booking details, totals
// per dish, then one row per guest with their choices and allergy notes.
// Logo is read from backend/logo.png (also checks backend/assets/logo.png and the repo-root logo.png).
function findLogo() {
    const options = [
        path.join(__dirname, '../logo.png'),
        path.join(__dirname, '../assets/logo.png'),
        path.join(__dirname, '../../logo.png')
    ];
    return options.find(p => fs.existsSync(p)) || null;
}

function niceDateStr(s) {
    const p = String(s || '').split('-');
    if (p.length !== 3) return s || '';
    const d = new Date(+p[0], +p[1] - 1, +p[2]);
    const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

function niceTimeStr(t) {
    if (!t || t.indexOf(':') === -1) return t || '';
    const [hh, mm] = t.split(':');
    const h = +hh;
    return `${h > 12 ? h - 12 : h}:${mm.slice(0, 2)}${h >= 12 ? 'pm' : 'am'}`;
}

async function generatePreorderPDF(bookingData, preorderData) {
    const firstName = pick(bookingData, ['firstName', 'first_name', 'firstname'], '');
    const lastName = pick(bookingData, ['lastName', 'last_name', 'lastname'], '');
    const fullName = `${firstName} ${lastName}`.trim() || 'N/A';
    const partySize = pick(bookingData, ['partySize', 'party_size'], '');
    const phone = pick(bookingData, ['phone', 'contactPhone', 'contact_phone'], '');
    const date = pick(bookingData, ['date'], '');
    const time = pick(bookingData, ['time'], '');
    const menuName = pick(bookingData, ['menu_name'], '');
    const specialRequests = pick(bookingData, ['specialRequests', 'special_requests'], '');
    const isBuffet = pick(bookingData, ['experience_id'], '') === 'buffet';

    // Resolve item names up front (older payloads may only send menu_item_id)
    const people = [];
    for (const person of (preorderData || [])) {
        const row = {
            number: person.person_number || people.length + 1,
            name: person.person_name || `Guest ${people.length + 1}`,
            notes: person.special_instructions || '',
            starter: '', main: '', side: '', dessert: '', items: [], orders: {}
        };
        if (Array.isArray(person.items)) {
            for (const sel of person.items) {
                let name = cleanName(sel.item_name || sel.name || '');
                if (!name && sel.menu_item_id) {
                    try {
                        const item = await dbHelpers.getMenuItemById(sel.menu_item_id);
                        name = item ? cleanName(item.name) : String(sel.menu_item_id);
                    } catch (err) { name = String(sel.menu_item_id); }
                }
                const course = (sel.course_type || '').toLowerCase();
                if (['starter', 'main', 'side', 'dessert'].includes(course)) {
                    row[course] = name;
                    if (typeof sel.menu_order === 'number') row.orders[course] = sel.menu_order;
                }
                row.items.push({ name, quantity: sel.quantity || 1 });
            }
        } else {
            ['starter', 'main', 'side', 'dessert'].forEach(k => { if (person[k]) row[k] = cleanName(person[k]); });
        }
        people.push(row);
    }

    const pdfPath = path.join(__dirname, '../temp', `preorder-${Date.now()}.pdf`);
    if (!fs.existsSync(path.dirname(pdfPath))) fs.mkdirSync(path.dirname(pdfPath), { recursive: true });

    return new Promise((resolve, reject) => {
        try {
            const M = 40;
            const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);
            const W = doc.page.width, H = doc.page.height, CW = W - M * 2;
            const INK = '#28221E', GREY = '#6E645C', RUST = '#8E3B22', LINE = '#C8C0B2';
            let y = M;
            const rule = () => { doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.6).strokeColor(LINE).stroke(); };
            const room = (need) => { if (y + need > H - M - 20) { doc.addPage(); y = M; return true; } return false; };

            // Header
            const logo = findLogo();
            if (logo) { try { doc.image(logo, M, y, { width: 130 }); } catch (e) { console.warn('Logo not added:', e.message); } }
            doc.fillColor(INK).font('Helvetica-Bold').fontSize(22).text('KITCHEN ORDER', M, y + 4, { width: CW, align: 'right' });
            doc.fontSize(14).text(`${niceDateStr(date)} at ${niceTimeStr(time)}`, M, y + 32, { width: CW, align: 'right' });
            doc.font('Helvetica').fontSize(11).text(`${partySize} guests  ·  ${isBuffet ? 'Buffet' : (menuName ? menuName + ' menu' : 'Preorder')}`, M, y + 50, { width: CW, align: 'right' });
            y += 76; rule(); y += 10;

            doc.font('Helvetica').fontSize(10.5).fillColor(INK);
            doc.text(`Organiser: ${fullName}${phone ? '  ·  ' + phone : ''}`, M, y, { width: CW }); y = doc.y + 2;
            if (specialRequests) { doc.text(`Notes: ${specialRequests}`, M, y, { width: CW }); y = doc.y + 2; }
            y += 8;

            if (isBuffet) {
                const dishes = people.length ? people[0].items : [];
                doc.font('Helvetica-Bold').fontSize(14).fillColor(INK).text(`Buffet for ${partySize}`, M, y); y = doc.y + 6;
                doc.font('Helvetica').fontSize(12);
                (dishes.length ? dishes.map(d => d.name) : ['To be chosen by phone']).forEach(n => {
                    room(20); doc.rect(M + 2, y + 1, 9, 9).lineWidth(0.8).strokeColor(INK).stroke();
                    doc.fillColor(INK).text(n, M + 18, y, { width: CW - 18 }); y = doc.y + 6;
                });
                const notes = people.length ? people[0].notes : '';
                if (notes) { y += 6; doc.font('Helvetica-Bold').fontSize(11).fillColor(RUST).text(`Dietary needs: ${notes}`, M, y, { width: CW }); }
            } else {
                // One section per course, identical dishes grouped together
                // (all the steaks together, etc). Dishes follow menu order when the
                // website sends it, otherwise A to Z.
                const groupsFor = (course) => {
                    const map = new Map();
                    people.forEach((p, idx) => {
                        const key = p[course] || (course === 'main' ? 'NOT CHOSEN YET' : null);
                        if (!key) return;
                        if (!map.has(key)) map.set(key, { name: key, guests: [], order: key === 'NOT CHOSEN YET' ? 99999 : 99998 });
                        const grp = map.get(key);
                        grp.guests.push(p);
                        if (typeof p.orders[course] === 'number') grp.order = Math.min(grp.order === 99998 ? Infinity : grp.order, p.orders[course]);
                    });
                    return [...map.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
                };
                const TITLES = { starter: 'STARTERS', main: 'MAINS', dessert: 'DESSERTS' };
                ['starter', 'main', 'dessert'].forEach(course => {
                    const groups = groupsFor(course);
                    if (!groups.length) return;
                    const total = groups.reduce((a, g) => a + g.guests.length, 0);
                    room(70);
                    doc.rect(M, y, CW, 20).fill(INK);
                    doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#FFFFFF').text(`${TITLES[course]}   ${total}`, M + 8, y + 5.5, { width: CW - 16, lineBreak: false });
                    y += 28;

                    groups.forEach((grp, gi) => {
                        let cont = false;
                        const head = () => {
                            doc.font('Helvetica-Bold').fontSize(13).fillColor(INK)
                               .text(`${grp.guests.length} x ${grp.name}${cont ? ' (cont.)' : ''}`, M, y, { width: CW });
                            y = doc.y + 5;
                        };
                        if (gi > 0) room(60);
                        head();
                        grp.guests.forEach(p => {
                            const side = course === 'main' && p.side ? `Side: ${p.side}` : '';
                            doc.font('Helvetica-Bold').fontSize(10);
                            const hName = doc.heightOfString(p.name, { width: 140 });
                            const hNote = p.notes ? doc.heightOfString(p.notes, { width: CW - 250 }) : 0;
                            doc.font('Helvetica').fontSize(10);
                            const hSide = side ? doc.heightOfString(side, { width: 105 }) : 0;
                            const rh = Math.max(hName, hNote, hSide, 11) + 4;
                            if (room(rh)) { cont = true; head(); }
                            doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(p.name, M + 12, y, { width: 140 });
                            if (side) doc.font('Helvetica').fontSize(10).fillColor(INK).text(side, M + 160, y, { width: 105 });
                            if (p.notes) doc.font('Helvetica-Bold').fontSize(10).fillColor(RUST).text(p.notes, M + 270, y, { width: CW - 270 });
                            y += rh - 2;
                            doc.moveTo(M + 12, y).lineTo(W - M, y).lineWidth(0.4).strokeColor('#E4DED4').stroke();
                            y += 2;
                        });
                        y += 8;
                    });
                    y += 6;
                });
            }

            // Footer on every page
            const range = doc.bufferedPageRange();
            for (let i = 0; i < range.count; i++) {
                doc.switchToPage(range.start + i);
                doc.page.margins.bottom = 0;
                doc.font('Helvetica').fontSize(8).fillColor(GREY)
                   .text(`The Scenic Inn  ·  ${lastName || fullName}, ${niceDateStr(date)}  ·  page ${i + 1} of ${range.count}`,
                         M, H - M + 8, { width: CW, align: 'center', lineBreak: false });
            }

            doc.end();
            stream.on('finish', () => resolve(pdfPath));
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
