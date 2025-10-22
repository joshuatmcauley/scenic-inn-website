// Global state
let currentStep = 1;
let bookingData = {};
let availableExperiences = [];
let availableSlots = [];
let menuItems = {};
let isEventPreorder = false;
let eventBookingData = {};
let menuSchedule = null; // Will store the menu schedule from menu-schedule.txt

// API Configuration
        const API_BASE_URL = 'https://scenic-inn-website-production.up.railway.app/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Set minimum date to today
    const dateInput = document.getElementById('booking-date');
    const eventDateInput = document.getElementById('event-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }
    if (eventDateInput) {
        const today = new Date().toISOString().split('T')[0];
        eventDateInput.min = today;
    }
    
    // Load experiences
    loadExperiences();
    
    // Load menu schedule (for future use)
    loadMenuSchedule();
    
    // Initialize step display - start with step 1
    currentStep = 1;
    updateStepDisplay();
    
    // Hide event preorder section initially
    const eventPreorder = document.getElementById('event-preorder');
    if (eventPreorder) {
        eventPreorder.style.display = 'none';
    }
}

function setupEventListeners() {
    // Party size change
    const partySizeSelect = document.getElementById('party-size');
    if (partySizeSelect) {
        partySizeSelect.addEventListener('change', handlePartySizeChange);
    }
    
    // Date change
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        dateInput.addEventListener('change', handleDateChange);
    }
    
    // Experience change
    const experienceSelect = document.getElementById('experience');
    if (experienceSelect) {
        experienceSelect.addEventListener('change', handleExperienceChange);
    }
    
    // Preorder toggle change
    const preorderToggle = document.getElementById('enable-preorder');
    if (preorderToggle) {
        preorderToggle.addEventListener('change', handlePreorderToggle);
    }
    
    // Event preorder form elements
    const eventPartySize = document.getElementById('event-party-size');
    const eventDate = document.getElementById('event-date');
    const eventTime = document.getElementById('event-time');
    
    if (eventPartySize) {
        eventPartySize.addEventListener('change', handleEventPartySizeChange);
    }
    if (eventDate) {
        eventDate.addEventListener('change', handleEventDateChange);
    }
    if (eventTime) {
        eventTime.addEventListener('change', handleEventTimeChange);
    }
}

// Step Navigation
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < 5) {
            currentStep++;
            
            updateStepDisplay();
            
            // Load data for next step
            if (currentStep === 2) {
                // Load time slots based on selected date
                populateTimeSelect();
            } else if (currentStep === 3) {
                // Show the automatically determined menu
                showSelectedMenu();
                // Load menu items for the selected experience
                loadMenuItems();
            }
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

function updateStepDisplay() {
    // Update progress bar
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        step.style.display = 'flex';
        
        if (index + 1 < currentStep) {
            step.classList.add('completed');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
        }
    });
    
    // Update step content - ONLY show the current step
    document.querySelectorAll('.step-content').forEach((content, index) => {
        content.classList.remove('active');
        
        if (index + 1 === currentStep) {
            content.classList.add('active');
            content.style.display = 'block';
        } else {
            content.style.display = 'none';
        }
    });
}

// Validation
function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            return validateStep1();
        case 2:
            return validateStep2();
        case 3:
            return validateStep3();
        case 4:
            return validateStep4();
        default:
            return true;
    }
}

function validateStep1() {
    const partySize = document.getElementById('party-size').value;
    const date = document.getElementById('booking-date').value;
    
    if (!partySize || !date) {
        showError('Please select party size and date');
        return false;
    }
    
    // Store data
    bookingData.party_size = parseInt(partySize);
    bookingData.date = date;
    
    return true;
}

function validateStep2() {
    const time = document.getElementById('booking-time').value;
    
    if (!time) {
        showError('Please select a time');
        return false;
    }
    
    // Store data
    bookingData.time = time;
    
    return true;
}

function validateStep3() {
    // Menu is automatically determined, so this step is always valid
    return true;
}

function showSelectedMenu() {
    const date = bookingData.date;
    const time = bookingData.time;
    
    if (!date || !time) {
        console.error('Date or time not available');
        return;
    }
    
    // Determine which menu is available for this date and time
    const menuType = getMenuForDateTime(date, time);
    
    if (!menuType) {
        console.error('No menu available for this date and time');
        return;
    }
    
    // Store the selected menu type FIRST
    bookingData.experience_id = menuType;
    console.log('Set experience_id to:', menuType);
    
    // Get menu data from available experiences (database)
    console.log('Looking for menu type:', menuType);
    console.log('Available experiences:', availableExperiences);
    const menuData = availableExperiences.find(exp => exp.id === menuType);
    
    if (!menuData) {
        console.error('Menu data not found for type:', menuType);
        console.log('Available experience IDs:', availableExperiences.map(exp => exp.id));
        return;
    }
    
    console.log('Found menu data:', menuData);
    
    // Update the menu info card
    const menuNameElement = document.getElementById('selected-menu-name');
    const menuDescElement = document.getElementById('selected-menu-description');
    
    if (menuNameElement) {
        menuNameElement.textContent = menuData.name;
    }
    
    if (menuDescElement) {
        menuDescElement.textContent = menuData.description;
    }
    
    // Show menu items if preorder is enabled
    if (bookingData.party_size >= 11 && bookingData.preorder_enabled) {
        populateMenuSelection();
    } else {
        // Just show a message that menu is determined
        const menuSelection = document.getElementById('menu-selection');
        if (menuSelection) {
            menuSelection.innerHTML = `
                <div class="menu-confirmation">
                    <p><strong>Your menu has been automatically selected:</strong></p>
                    <p>Based on your selected date and time, you will be served from the <strong>${menuData.name}</strong>.</p>
                    <p>${menuData.description}</p>
                </div>
            `;
        }
    }
}

function validateStep4() {
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    
    if (!firstName || !lastName || !email || !phone) {
        showError('Please fill in all required contact details');
        return false;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Please enter a valid email address');
        return false;
    }
    
    // Store data
    bookingData.first_name = firstName;
    bookingData.last_name = lastName;
    bookingData.email = email;
    bookingData.phone = phone;
    bookingData.special_requests = document.getElementById('special-requests').value;
    bookingData.marketing_consent = document.getElementById('marketing-consent').checked;
    
    return true;
}

// Event Handlers
function handlePartySizeChange() {
    const partySize = parseInt(document.getElementById('party-size').value);
    const notice = document.getElementById('large-party-notice');
    const preorderToggle = document.getElementById('enable-preorder');
    
    if (partySize >= 11) {
        notice.style.display = 'block';
        // Reset preorder toggle when party size changes
        if (preorderToggle) {
            preorderToggle.checked = false;
            handlePreorderToggle();
        }
    } else {
        notice.style.display = 'none';
        // Store that preorder is not enabled for small parties
        bookingData.preorder_enabled = false;
    }
}

function handlePreorderToggle() {
    const preorderToggle = document.getElementById('enable-preorder');
    const preorderInfo = document.getElementById('preorder-info');
    const partySize = parseInt(document.getElementById('party-size').value);
    
    if (preorderToggle && preorderInfo) {
        if (preorderToggle.checked) {
            preorderInfo.style.display = 'block';
            bookingData.preorder_enabled = true;
            // Update menu instruction
            const instruction = document.getElementById('menu-instruction');
            if (instruction) {
                instruction.textContent = `Select meals for each of the ${partySize} people in your party`;
            }
        } else {
            preorderInfo.style.display = 'none';
            bookingData.preorder_enabled = false;
            // Update menu instruction
            const instruction = document.getElementById('menu-instruction');
            if (instruction) {
                instruction.textContent = 'No preorder required for this booking';
            }
        }
        
        // Update step display to show/hide step 3
        updateStepDisplay();
    }
}

function handleDateChange() {
    const date = document.getElementById('booking-date').value;
    if (date) {
        // Populate time slots
        populateTimeSelect();
    }
}

function handleExperienceChange() {
    const experienceId = document.getElementById('experience').value;
    if (experienceId && currentStep >= 3) {
        loadMenuItems();
    }
}

// API Calls
async function loadExperiences() {
    try {
        // Try to load from local database first
        const response = await fetch(`${API_BASE_URL}/menus`);
        const data = await response.json();
        
        if (response.ok && data) {
            // Convert menu data to experience format
            availableExperiences = data.map(menu => ({
                id: menu.id,
                name: menu.name,
                description: menu.schedule,
                price: menu.pricing ? JSON.parse(menu.pricing) : null
            }));
            console.log('Menus loaded from local database:', availableExperiences);
            populateExperienceSelect();
        } else {
            throw new Error('Failed to load menus from local database');
        }
    } catch (error) {
        console.error('Error loading experiences:', error);
        // Load time slots
        availableExperiences = [
            { id: 'tea-time', name: 'Tea Time Menu', description: 'Monday-Thursday 5pm-8:30pm', price: { '2-courses': 22, '3-courses': 25 } },
            { id: 'weekend', name: 'Weekend Evening Menu', description: 'Friday-Sunday 5pm-9pm', price: null },
            { id: 'sunday', name: 'Sunday Lunch Menu', description: 'Sunday 12pm-5pm', price: { '1-course': 16.95, '2-courses': 20.95, '3-courses': 24.95 } },
            { id: 'lunch', name: 'Lunch Menu', description: 'Monday-Saturday 12pm-4:45pm', price: null }
        ];
        populateExperienceSelect();
    }
}

async function loadAvailableSlots() {
    if (!bookingData.date || !bookingData.party_size || !bookingData.experience_id) {
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch(
            `${API_BASE_URL}/dojo/availability?date=${bookingData.date}&party_size=${bookingData.party_size}`
        );
        const data = await response.json();
        
        if (response.ok) {
            availableSlots = data.slots || [];
            populateTimeSelect();
        } else {
            showError('Failed to load available times');
        }
    } catch (error) {
        console.error('Error loading slots:', error);
        showError('Failed to load available times');
    } finally {
        showLoading(false);
    }
}

async function loadMenuItems() {
    console.log('loadMenuItems called with experience_id:', bookingData.experience_id);
    if (!bookingData.experience_id) {
        console.log('No experience_id found, returning');
        return;
    }
    
    try {
        showLoading(true);
        
        // First, get menu pricing information
        const pricingResponse = await fetch(`${API_BASE_URL}/menus/${bookingData.experience_id}/pricing`);
        let pricingData = await pricingResponse.json();
        console.log('Menu pricing response:', pricingData);
        
        // Then get menu items
        console.log('Fetching menu items from:', `${API_BASE_URL}/menus/${bookingData.experience_id}/items?forPreorder=true`);
        const response = await fetch(`${API_BASE_URL}/menus/${bookingData.experience_id}/items?forPreorder=true`);
        let data = await response.json();
        console.log('Menu items response:', data);
        
        if (response.ok && data) {
            // Handle both shapes: { success, data: [...] } or direct array
            let raw = Array.isArray(data) ? data : (data.data || []);

            // No client-side fallback: if lunch is empty we will show an error so we can fix data

            // Some endpoints return a flat list of items with section_key/section_name
            // Normalize into categories grouped by section_key
            if (raw.length > 0 && !raw[0].items && raw[0].section_key) {
                const grouped = {};
                raw.forEach(item => {
                    const key = (item.section_key || '').toString().toLowerCase();
                    if (!grouped[key]) {
                        grouped[key] = { name: key, items: [] };
                    }
                    grouped[key].items.push({
                        id: item.id,
                        name: item.name,
                        description: item.description || '',
                        price: item.price,
                        pricing_type: item.pricing_type,
                        comes_with_side: item.comes_with_side
                    });
                });
                menuItems = { categories: Object.values(grouped) };
                console.log('Menu items grouped:', menuItems);
                console.log('Main course items:', grouped['main-courses'] || grouped['main']);
            } else {
                // Already grouped by sections with items
                menuItems = {
                    categories: raw.map(section => ({
                        // Prefer section_key if present for categorization logic
                        name: (section.section_key || section.name || '').toString().toLowerCase(),
                        items: (section.items || []).map(item => ({
                            id: item.id,
                            name: item.name,
                            description: item.description || '',
                            price: item.price,
                            pricing_type: item.pricing_type
                        }))
                    }))
                };
            }
            
            // Store pricing information
            if (pricingResponse.ok && pricingData.success) {
                menuItems.pricing_info = pricingData.data;
            }
            
            console.log('Menu items loaded:', menuItems);
            populateMenuSelection();
        } else {
            showError('Failed to load menu items');
        }
    } catch (error) {
        console.error('Error loading menu items:', error);
        showError('Failed to load menu items');
    } finally {
        showLoading(false);
    }
}

// Populate UI Elements
function populateExperienceSelect() {
    const select = document.getElementById('experience');
    if (!select) {
        console.log('Experience select element not found - likely on wrong page');
        return;
    }
    
    select.innerHTML = '<option value="">Select experience</option>';
    
    availableExperiences.forEach(experience => {
        const option = document.createElement('option');
        option.value = experience.id;
        option.textContent = `${experience.name} - ${experience.price}`;
        select.appendChild(option);
    });
}

function populateTimeSelect() {
    const select = document.getElementById('booking-time');
    if (!select) {
        console.error('Time select element not found');
        return;
    }
    
    select.innerHTML = '<option value="">Select time</option>';
    
    // If we have available slots from API, use them
    if (availableSlots && availableSlots.length > 0) {
        availableSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.time;
            option.textContent = slot.time;
            select.appendChild(option);
        });
    } else {
        // Fallback to day-specific time slots
        const date = document.getElementById('booking-date').value;
        if (date) {
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            console.log('Day name:', dayName);
            
            const timeSlots = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
            console.log('Time slots for', dayName, ':', timeSlots);
            
            // Remove duplicates and sort
            const uniqueTimeSlots = [...new Set(timeSlots)].sort();
            console.log('Unique time slots:', uniqueTimeSlots);
            
            uniqueTimeSlots.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                select.appendChild(option);
            });
        } else {
            console.log('No date selected');
        }
    }
}

function populateMenuSelection() {
    const container = document.getElementById('menu-selection');
    container.innerHTML = '';
    
    // Update menu name and description
    const menuNameElement = document.getElementById('selected-menu-name');
    const menuDescriptionElement = document.getElementById('selected-menu-description');
    
    if (menuNameElement && menuDescriptionElement && menuItems.pricing_info) {
        menuNameElement.textContent = menuItems.pricing_info.name || 'Menu';
        
        // Create description based on pricing type
        let description = '';
        if (menuItems.pricing_info.pricing_type === 'course' && menuItems.pricing_info.pricing) {
            const pricingOptions = Object.entries(menuItems.pricing_info.pricing)
                .map(([courses, price]) => `${courses}: £${price}`)
                .join(', ');
            description = `Fixed price menu - ${pricingOptions}`;
        } else if (menuItems.pricing_info.pricing_type === 'individual') {
            description = 'Individual item pricing - each item priced separately';
        } else {
            description = 'Menu items available for selection';
        }
        menuDescriptionElement.textContent = description;
    }
    
    // Only show menu selection for parties of 11+ with preorder enabled
    if (bookingData.party_size < 11) {
        container.innerHTML = '<p class="text-center">No preorder required for parties under 11 people.</p>';
        return;
    }
    
    if (!bookingData.preorder_enabled) {
        container.innerHTML = '<p class="text-center">Preorder is not enabled for this booking. You can order when you arrive.</p>';
        return;
    }
    
    // Create menu selection for each person
    for (let i = 1; i <= bookingData.party_size; i++) {
        const personDiv = document.createElement('div');
        personDiv.className = 'person-menu';
        personDiv.innerHTML = `
            <div class="person-header">
                <div class="person-avatar">${i}</div>
                <div class="person-name">Person ${i}</div>
            </div>
            <div class="menu-categories">
                ${generateMenuCategories(i)}
            </div>
        `;
        container.appendChild(personDiv);
    }
}

function generateMenuCategories(personNumber) {
    if (!menuItems.categories) {
        return '<p>No menu items available</p>';
    }
    
    // Group items by course type using EXACT section keys from database
    const starters = [];
    const mains = [];
    const desserts = [];
    const sides = [];
    
    menuItems.categories.forEach(category => {
        const sectionKey = category.name; // Use exact case from database
        
        console.log(`Processing section: "${sectionKey}" with ${category.items.length} items`);
        
        // Starters - exact matches
        if (sectionKey === 'starters' || sectionKey === 'light-bites') {
            starters.push(...category.items);
            console.log(`  → Added to starters: ${category.items.map(item => item.name).join(', ')}`);
        }
        // Main courses - all main course types
        else if (sectionKey === 'main-course' || sectionKey === 'main-courses' || 
                 sectionKey === 'chicken-dishes' || sectionKey === 'fish-dishes' || 
                 sectionKey === 'vegan-dishes' || sectionKey === 'burgers' || 
                 sectionKey === 'loaded-fries') {
            mains.push(...category.items);
            console.log(`  → Added to mains: ${category.items.map(item => item.name).join(', ')}`);
        }
        // Desserts - exact match
        else if (sectionKey === 'desserts') {
            desserts.push(...category.items);
            console.log(`  → Added to desserts: ${category.items.map(item => item.name).join(', ')}`);
        }
        // Sides - separate category
        else if (sectionKey === 'sides' || sectionKey === 'side-orders' || sectionKey === 'dips' || sectionKey === 'sauces') {
            sides.push(...category.items);
            console.log(`  → Added to sides: ${category.items.map(item => item.name).join(', ')}`);
        }
        else {
            console.warn(`  → Unknown section key: "${sectionKey}" - defaulting to mains`);
            mains.push(...category.items);
        }
    });
    
    // Check if there are any desserts or sides available
    const hasDesserts = desserts.length > 0;
    const hasSides = sides.length > 0;
    
    // Add pricing information header
    const pricingInfo = getPricingInfoDisplay();
    
    return `
        <div class="course-selection">
            ${pricingInfo}
            <div class="course-group">
                <label for="person-${personNumber}-starter">Starter:</label>
                <select id="person-${personNumber}-starter" name="person-${personNumber}-starter">
                    <option value="">Select a starter</option>
                    ${starters.map(item => `
                        <option value="${item.id}">${item.name}${getItemPriceDisplay(item)}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="course-group">
                <label for="person-${personNumber}-main">Main Course:</label>
                <select id="person-${personNumber}-main" name="person-${personNumber}-main" onchange="toggleSideDropdown(${personNumber}); toggleSteakRarity(${personNumber})">
                    <option value="">Select a main course</option>
                    ${mains.map(item => `
                        <option value="${item.id}" data-comes-with-side="${item.comes_with_side || false}" data-is-steak="${item.is_steak || false}">${item.name}${getItemPriceDisplay(item)}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="course-group" id="person-${personNumber}-steak-rarity-group" style="display: none;">
                <label for="person-${personNumber}-steak-rarity">How would you like your steak cooked?</label>
                <select id="person-${personNumber}-steak-rarity" name="person-${personNumber}-steak-rarity">
                    <option value="">Select cooking preference</option>
                    <option value="WD">Well Done (WD)</option>
                    <option value="MW">Medium Well (MW)</option>
                    <option value="M">Medium (M)</option>
                    <option value="MR">Medium Rare (MR)</option>
                    <option value="R">Rare (R)</option>
                    <option value="B">Blue (B)</option>
                </select>
            </div>
            
            ${hasSides ? `
            <div class="course-group" id="person-${personNumber}-side-group">
                <label for="person-${personNumber}-side">Side (Optional):</label>
                <select id="person-${personNumber}-side" name="person-${personNumber}-side">
                    <option value="">Select a side (optional)</option>
                    ${sides.map(item => `
                        <option value="${item.id}">${item.name}${getItemPriceDisplay(item)}</option>
                    `).join('')}
                </select>
            </div>
            ` : ''}
            
            ${hasDesserts ? `
            <div class="course-group">
                <label for="person-${personNumber}-dessert">Dessert:</label>
                <select id="person-${personNumber}-dessert" name="person-${personNumber}-dessert">
                    <option value="">Select a dessert</option>
                    ${desserts.map(item => `
                        <option value="${item.id}">${item.name}${getItemPriceDisplay(item)}</option>
                    `).join('')}
                </select>
            </div>
            ` : ''}
            
            <div class="course-group">
                <label for="person-${personNumber}-notes">Special Instructions/Notes:</label>
                <textarea id="person-${personNumber}-notes" name="person-${personNumber}-notes" 
                    placeholder="Any dietary requirements, allergies, or special requests for this person..." 
                    rows="2" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit;"></textarea>
            </div>
        </div>
    `;
}

// Helper function to display pricing information
function getPricingInfoDisplay() {
    const pricingInfo = menuItems.pricing_info;
    
    if (!pricingInfo) {
        return '';
    }
    
    if (pricingInfo.pricing_type === 'course' && pricingInfo.pricing) {
        // Show course pricing options
        const pricingOptions = Object.entries(pricingInfo.pricing)
            .map(([courses, price]) => `${courses}: £${price}`)
            .join(', ');
        return `
            <div class="pricing-info">
                <h4>Menu Pricing: ${pricingOptions}</h4>
                <p><em>Select your courses below - pricing is per person for the full meal</em></p>
            </div>
        `;
    } else if (pricingInfo.pricing_type === 'individual') {
        return `
            <div class="pricing-info">
                <h4>Individual Item Pricing</h4>
                <p><em>Each item is priced individually as shown</em></p>
            </div>
        `;
    }
    
    return '';
}

// Helper function to display item pricing based on menu pricing type
function getItemPriceDisplay(item) {
    const pricingType = menuItems.pricing_info?.pricing_type;
    
    if (pricingType === 'course') {
        // For course pricing, don't show individual item prices
        return '';
    } else if (pricingType === 'individual') {
        // For individual pricing, show the item price
        return item.price ? ` - £${item.price}` : '';
    } else {
        // Fallback to showing price if available
        return item.price ? ` - £${item.price}` : '';
    }
}

// Function to toggle side dropdown based on selected main course
function toggleSideDropdown(personNumber) {
    const mainSelect = document.getElementById(`person-${personNumber}-main`);
    const sideGroup = document.getElementById(`person-${personNumber}-side-group`);
    const sideSelect = document.getElementById(`person-${personNumber}-side`);
    
    console.log('toggleSideDropdown called for person', personNumber);
    console.log('mainSelect:', mainSelect);
    console.log('sideGroup:', sideGroup);
    console.log('sideSelect:', sideSelect);
    
    if (!mainSelect || !sideGroup || !sideSelect) {
        console.log('Missing elements - returning early');
        return;
    }
    
    const selectedOption = mainSelect.options[mainSelect.selectedIndex];
    const comesWithSide = selectedOption ? selectedOption.getAttribute('data-comes-with-side') === 'true' : false;
    
    console.log('Selected option:', selectedOption);
    console.log('comesWithSide value:', comesWithSide);
    console.log('data-comes-with-side attribute:', selectedOption ? selectedOption.getAttribute('data-comes-with-side') : 'no option');
    
    // Remove any existing side note
    const mainGroup = mainSelect.closest('.course-group');
    let sideNote = mainGroup.querySelector('.side-note');
    if (sideNote) {
        sideNote.remove();
    }

    if (comesWithSide) {
        // Show side dropdown - customer can choose which side they want
        sideGroup.style.display = 'block';
        console.log('Showing sides dropdown - customer can choose a side');
    } else {
        // Hide side dropdown and clear selection - item doesn't come with a side
        sideGroup.style.display = 'none';
        sideSelect.value = '';
        console.log('Hiding sides dropdown - item does not come with a side');
    }
}

// Function to toggle steak rarity dropdown based on selected main course
function toggleSteakRarity(personNumber) {
    const mainSelect = document.getElementById(`person-${personNumber}-main`);
    const steakRarityGroup = document.getElementById(`person-${personNumber}-steak-rarity-group`);
    const steakRaritySelect = document.getElementById(`person-${personNumber}-steak-rarity`);
    
    console.log('toggleSteakRarity called for person', personNumber);
    
    if (!mainSelect || !steakRarityGroup || !steakRaritySelect) {
        console.log('Missing steak rarity elements - returning early');
        return;
    }
    
    const selectedOption = mainSelect.options[mainSelect.selectedIndex];
    const isSteak = selectedOption ? selectedOption.getAttribute('data-is-steak') === 'true' : false;
    
    console.log('Selected option:', selectedOption);
    console.log('isSteak value:', isSteak);
    
    if (isSteak) {
        // Show steak rarity dropdown
        steakRarityGroup.style.display = 'block';
        steakRaritySelect.required = true;
        console.log('Showing steak rarity dropdown - item is a steak');
    } else {
        // Hide steak rarity dropdown
        steakRarityGroup.style.display = 'none';
        steakRaritySelect.value = ''; // Clear selection
        steakRaritySelect.required = false;
        console.log('Hiding steak rarity dropdown - item is not a steak');
    }
}

// Data Collection
function collectPreorderData() {
    const preorderData = [];
    
    for (let i = 1; i <= bookingData.party_size; i++) {
        const items = [];
        
        // Get starter selection
        const starterSelect = document.getElementById(`person-${i}-starter`);
        if (starterSelect && starterSelect.value) {
            items.push({
                menu_item_id: starterSelect.value,
                course_type: 'starter',
                item_name: starterSelect.options[starterSelect.selectedIndex]?.text || '',
                quantity: 1,
                special_instructions: ''
            });
        }
        
        // Get main course selection
        const mainSelect = document.getElementById(`person-${i}-main`);
        if (mainSelect && mainSelect.value) {
            let itemName = mainSelect.options[mainSelect.selectedIndex]?.text || '';
            
            // Check if this is a steak and get rarity
            const steakRaritySelect = document.getElementById(`person-${i}-steak-rarity`);
            if (steakRaritySelect && steakRaritySelect.value) {
                itemName += ` (${steakRaritySelect.value})`;
            }
            
            items.push({
                menu_item_id: mainSelect.value,
                course_type: 'main',
                item_name: itemName,
                quantity: 1,
                special_instructions: '',
                steak_rarity: steakRaritySelect ? steakRaritySelect.value : null
            });
        }
        
        // Get side selection (optional)
        const sideSelect = document.getElementById(`person-${i}-side`);
        if (sideSelect && sideSelect.value) {
            items.push({
                menu_item_id: sideSelect.value,
                course_type: 'side',
                item_name: sideSelect.options[sideSelect.selectedIndex]?.text || '',
                quantity: 1,
                special_instructions: ''
            });
        }
        
        // Get dessert selection
        const dessertSelect = document.getElementById(`person-${i}-dessert`);
        if (dessertSelect && dessertSelect.value) {
            items.push({
                menu_item_id: dessertSelect.value,
                course_type: 'dessert',
                item_name: dessertSelect.options[dessertSelect.selectedIndex]?.text || '',
                quantity: 1,
                special_instructions: ''
            });
        }
        
        // Get notes for this person
        const notesElement = document.getElementById(`person-${i}-notes`);
        const personNotes = notesElement ? notesElement.value.trim() : '';
        
        if (items.length > 0 || personNotes) {
            preorderData.push({
                person_number: i,
                items: items,
                special_instructions: personNotes
            });
        }
    }
    
    return preorderData;
}

// Booking Submission
async function submitBooking() {
    if (!validateCurrentStep()) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Collect preorder data if enabled
        if (bookingData.preorder_enabled && bookingData.party_size >= 11) {
            bookingData.preorder = collectPreorderData();
        }
        
        const response = await fetch(`${API_BASE_URL}/booking-submission`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showConfirmation(result.booking || { id: 'BOOKING-' + Date.now() });
        } else {
            showError(result.message || 'Failed to create booking');
        }
    } catch (error) {
        console.error('Error submitting booking:', error);
        showError('Failed to create booking. Please try again.');
    } finally {
        showLoading(false);
    }
}

function showConfirmation(booking) {
    currentStep = 5;
    updateStepDisplay();
    
    const container = document.getElementById('confirmation-details');
    container.innerHTML = `
        <div class="confirmation-item">
            <span class="confirmation-label">Booking Reference:</span>
            <span class="confirmation-value">${booking.id || 'N/A'}</span>
        </div>
        <div class="confirmation-item">
            <span class="confirmation-label">Date & Time:</span>
            <span class="confirmation-value">${bookingData.date} at ${bookingData.time}</span>
        </div>
        <div class="confirmation-item">
            <span class="confirmation-label">Party Size:</span>
            <span class="confirmation-value">${bookingData.party_size} people</span>
        </div>
        <div class="confirmation-item">
            <span class="confirmation-label">Contact:</span>
            <span class="confirmation-value">${bookingData.email}</span>
        </div>
        ${bookingData.preorder ? `
        <div class="confirmation-item">
            <span class="confirmation-label">Preorder:</span>
            <span class="confirmation-value">Yes (${bookingData.preorder.length} people)</span>
        </div>
        ` : ''}
    `;
}

// Utility Functions
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function showError(message) {
    const modal = document.getElementById('error-modal');
    const messageElement = document.getElementById('error-message');
    messageElement.textContent = message;
    modal.classList.add('active');
}

function closeErrorModal() {
    const modal = document.getElementById('error-modal');
    modal.classList.remove('active');
}

function startNewBooking() {
    // Reset everything
    currentStep = 1;
    bookingData = {};
    availableExperiences = [];
    availableSlots = [];
    menuItems = {};
    
    // Reset form
    document.querySelectorAll('input, select, textarea').forEach(element => {
        if (element.type === 'checkbox') {
            element.checked = false;
        } else {
            element.value = '';
        }
    });
    
    // Hide large party notice
    const notice = document.getElementById('large-party-notice');
    if (notice) {
        notice.style.display = 'none';
    }
    
    // Go to first step
    updateStepDisplay();
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('error-modal');
    if (event.target === modal) {
        closeErrorModal();
    }
});

// Event Preorder Functions
function showEventPreorder() {
    isEventPreorder = true;
    eventBookingData = {};
    
    // Hide all regular steps
    document.querySelectorAll('.step-content').forEach(content => {
        if (content.id !== 'event-preorder') {
            content.classList.remove('active');
            content.style.display = 'none';
        }
    });
    
    // Show event preorder section
    document.getElementById('event-preorder').classList.add('active');
    document.getElementById('event-preorder').style.display = 'block';
    
    // Hide progress bar
    document.querySelector('.progress-container').style.display = 'none';
    
    // Load menu items for event preorder
    loadEventMenuItems();
}

function showRegularBooking() {
    isEventPreorder = false;
    eventBookingData = {};
    
    // Hide event preorder section
    document.getElementById('event-preorder').classList.remove('active');
    document.getElementById('event-preorder').style.display = 'none';
    
    // Show progress bar
    document.querySelector('.progress-container').style.display = 'block';
    
    // Reset to step 1
    currentStep = 1;
    updateStepDisplay();
}

function handleEventPartySizeChange() {
    const partySize = parseInt(document.getElementById('event-party-size').value);
    if (partySize) {
        // Load available slots when party size is selected
        const date = document.getElementById('event-date').value;
        if (date) {
            loadEventAvailableSlots();
        }
    }
}

function handleEventDateChange() {
    const date = document.getElementById('event-date').value;
    const partySize = parseInt(document.getElementById('event-party-size').value);
    if (date && partySize) {
        // Populate time slots
        populateEventTimeSelect();
    }
    
    // Also load menu items if time is already selected
    const time = document.getElementById('event-time').value;
    if (date && time) {
        loadEventMenuItems();
    }
}

function handleEventTimeChange() {
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    if (date && time) {
        loadEventMenuItems();
    }
}


async function loadEventAvailableSlots() {
    const date = document.getElementById('event-date').value;
    const partySize = parseInt(document.getElementById('event-party-size').value);
    
    if (!date || !partySize) return;
    
    try {
        showLoading(true);
        
        // Populate with available times
        // Later this will connect to Dojo API
        populateEventTimeSelect();
        
    } catch (error) {
        console.error('Error loading slots:', error);
        showError('Failed to load available times');
    } finally {
        showLoading(false);
    }
}

function populateEventTimeSelect() {
    const select = document.getElementById('event-time');
    if (!select) {
        console.error('Event time select element not found');
        return;
    }
    
    select.innerHTML = '<option value="">Select time</option>';
    
    const date = document.getElementById('event-date').value;
    if (!date) {
        console.log('No event date selected');
        return;
    }
    
    // Get day of week from date
    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    console.log('Event day name:', dayName);
    
    // Get appropriate time slots for the day
    const timeSlots = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
    console.log('Event time slots for', dayName, ':', timeSlots);
    
    // Remove duplicates and sort
    const uniqueTimeSlots = [...new Set(timeSlots)].sort();
    console.log('Event unique time slots:', uniqueTimeSlots);
    
    uniqueTimeSlots.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        select.appendChild(option);
    });
}

async function loadEventMenuItems() {
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    
    if (!date || !time) {
        showError('Please select date and time first');
        return;
    }
    
    // Determine which menu to load based on date and time
    const selectedMenu = getMenuForDateTime(date, time);
    
    try {
        showLoading(true);
        
        // For now, we'll use mock data. Later this will connect to your database
        const menuData = getMockMenuData(selectedMenu);
        
        if (menuData) {
            menuItems = menuData;
            populateEventMenuSelection();
            
            // Show which menu is being displayed
            showMenuInfo(selectedMenu);
        } else {
            showError('No menu available for the selected date and time');
        }
    } catch (error) {
        console.error('Error loading menu items:', error);
        showError('Failed to load menu items');
    } finally {
        showLoading(false);
    }
}

function getMenuForDateTime(date, time) {
    const bookingDate = new Date(date);
    const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = parseInt(time.split(':')[0]);
    const minute = parseInt(time.split(':')[1]);
    const timeInMinutes = hour * 60 + minute;
    
    console.log(`Checking menu for: ${date} (day ${dayOfWeek}) at ${time} (${timeInMinutes} minutes)`);
    
    // Sunday Lunch Menu: Sunday 12pm-5pm (PRIORITY - check first for Sunday)
    if (dayOfWeek === 0 && 
        (timeInMinutes >= 12 * 60 && timeInMinutes <= 17 * 60)) {
        console.log('Selected: Sunday Lunch Menu');
        return 'sunday-lunch';
    }
    
    // Weekend Evening Menu: Friday, Saturday, Sunday 5pm-9pm
    if ((dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) && 
        (timeInMinutes >= 17 * 60 && timeInMinutes <= 21 * 60)) {
        console.log('Selected: Weekend Evening Menu');
        return 'weekend-evening';
    }
    
    // Tea Time Menu: Monday-Thursday 5pm-8.30pm
    if ((dayOfWeek >= 1 && dayOfWeek <= 4) && 
        (timeInMinutes >= 17 * 60 && timeInMinutes <= 20 * 60 + 30)) {
        console.log('Selected: Tea Time Menu');
        return 'tea-time';
    }
    
    // Lunch Menu: Monday-Saturday 12pm-4.45pm (NOT Sunday)
    if ((dayOfWeek >= 1 && dayOfWeek <= 6) && 
        (timeInMinutes >= 12 * 60 && timeInMinutes <= 16 * 60 + 45)) {
        console.log('Selected: Lunch Menu');
        return 'lunch';
    }
    
    console.log('No menu available for this date and time');
    return null; // No menu available for this time
}


// Load menu schedule from menu-schedule.txt (for future use)
async function loadMenuSchedule() {
    try {
        const response = await fetch('menu-schedule.txt');
        if (response.ok) {
            const text = await response.text();
            console.log('Menu schedule loaded:', text);
            // Parse the schedule and store it for future use
            menuSchedule = parseMenuSchedule(text);
        } else {
            console.log('Menu schedule file not found, using hardcoded schedule');
        }
    } catch (error) {
        console.log('Could not load menu schedule, using hardcoded schedule:', error);
    }
}

// Parse menu schedule text file (for future use)
function parseMenuSchedule(text) {
    const lines = text.split('\n');
    const schedule = [];
    
    lines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            // Parse format: "Menu Name" "Days" "Time Range"
            const match = line.match(/"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"/);
            if (match) {
                schedule.push({
                    menu: match[1],
                    days: match[2].split(','),
                    timeRange: match[3]
                });
            }
        }
    });
    
    return schedule;
}

function showMenuInfo(menuType) {
    const menuData = getMockMenuData(menuType);
    if (!menuData) return;
    
    // Create or update menu info display
    let menuInfo = document.getElementById('menu-info');
    if (!menuInfo) {
        menuInfo = document.createElement('div');
        menuInfo.id = 'menu-info';
        menuInfo.className = 'menu-info';
        
        const container = document.getElementById('event-menu-selection');
        container.parentNode.insertBefore(menuInfo, container);
    }
    
    menuInfo.innerHTML = `
        <div class="menu-info-card">
            <h3>${menuData.name}</h3>
            <p>${menuData.description}</p>
        </div>
    `;
}

function populateEventMenuSelection() {
    const container = document.getElementById('event-menu-selection');
    container.innerHTML = '';
    
    if (!menuItems.categories) {
        container.innerHTML = '<p class="text-center">No menu items available</p>';
        return;
    }
    
    const menuGrid = document.createElement('div');
    menuGrid.className = 'event-menu-grid';
    
    menuItems.categories.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'event-category';
        
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'event-category-title';
        categoryTitle.textContent = category.name;
        
        const itemsGrid = document.createElement('div');
        itemsGrid.className = 'event-items-grid';
        
        category.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'event-item';
            itemDiv.innerHTML = `
                <div class="event-item-header">
                    <div class="event-item-name">${item.name}</div>
                    <div class="event-item-price">${item.price}</div>
                </div>
                <div class="event-item-description">${item.description || ''}</div>
                <div class="event-item-controls">
                    <div class="quantity-controls">
                        <button type="button" class="quantity-btn" onclick="changeEventQuantity('${item.id}', -1)">-</button>
                        <input type="number" class="quantity-input" id="qty-${item.id}" value="0" min="0" max="100" onchange="updateEventTotal()">
                        <button type="button" class="quantity-btn" onclick="changeEventQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
            `;
            itemsGrid.appendChild(itemDiv);
        });
        
        categoryDiv.appendChild(categoryTitle);
        categoryDiv.appendChild(itemsGrid);
        menuGrid.appendChild(categoryDiv);
    });
    
    // Add total section
    const totalDiv = document.createElement('div');
    totalDiv.className = 'event-total';
    totalDiv.innerHTML = `
        <h3>Total Items</h3>
        <div class="event-total-amount" id="event-total-amount">0</div>
    `;
    
    container.appendChild(menuGrid);
    container.appendChild(totalDiv);
    
    updateEventTotal();
}

function changeEventQuantity(itemId, change) {
    const input = document.getElementById(`qty-${itemId}`);
    const currentValue = parseInt(input.value) || 0;
    const newValue = Math.max(0, currentValue + change);
    input.value = newValue;
    updateEventTotal();
}

function updateEventTotal() {
    let total = 0;
    const inputs = document.querySelectorAll('.quantity-input');
    
    inputs.forEach(input => {
        const quantity = parseInt(input.value) || 0;
        total += quantity;
    });
    
    document.getElementById('event-total-amount').textContent = total;
}

async function submitEventPreorder() {
    // Collect event booking data
    const partySize = parseInt(document.getElementById('event-party-size').value);
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    
    if (!partySize || !date || !time) {
        showError('Please fill in all required fields');
        return;
    }
    
    // Determine which menu was selected
    const selectedMenu = getMenuForDateTime(date, time);
    const experienceId = selectedMenu || 'event-preorder';
    
    // Collect preorder data
    const preorderData = [];
    const inputs = document.querySelectorAll('.quantity-input');
    
    inputs.forEach(input => {
        const quantity = parseInt(input.value) || 0;
        if (quantity > 0) {
            const itemId = input.id.replace('qty-', '');
            preorderData.push({
                menu_item_id: itemId,
                quantity: quantity,
                special_instructions: ''
            });
        }
    });
    
    if (preorderData.length === 0) {
        showError('Please select at least one item for your event');
        return;
    }
    
    // Prepare booking data
    eventBookingData = {
        party_size: partySize,
        experience_id: experienceId,
        date: date,
        time: time,
        preorder_enabled: true,
        preorder: [{
            person_number: 1,
            items: preorderData
        }],
        // Add contact details (you might want to add a form for this)
        first_name: 'Event',
        last_name: 'Booking',
        email: 'event@scenicinn.com',
        phone: '000-000-0000',
        special_requests: 'Event preorder booking',
        marketing_consent: false
    };
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/booking-submission`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventBookingData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showEventConfirmation(result.booking || { id: 'EVENT-' + Date.now() });
        } else {
            showError(result.message || 'Failed to create event booking');
        }
    } catch (error) {
        console.error('Error submitting event booking:', error);
        showError('Failed to create event booking. Please try again.');
    } finally {
        showLoading(false);
    }
}

function showEventConfirmation(booking) {
    const container = document.getElementById('event-menu-selection');
    container.innerHTML = `
        <div class="confirmation-details">
            <h2 style="color: #4CAF50; text-align: center; margin-bottom: 20px;">🎉 Event Preorder Confirmed!</h2>
            <div class="confirmation-item">
                <span class="confirmation-label">Booking Reference:</span>
                <span class="confirmation-value">${booking.id || 'N/A'}</span>
            </div>
            <div class="confirmation-item">
                <span class="confirmation-label">Date & Time:</span>
                <span class="confirmation-value">${eventBookingData.date} at ${eventBookingData.time}</span>
            </div>
            <div class="confirmation-item">
                <span class="confirmation-label">Party Size:</span>
                <span class="confirmation-value">${eventBookingData.party_size} people</span>
            </div>
            <div class="confirmation-item">
                <span class="confirmation-label">Total Items:</span>
                <span class="confirmation-value">${document.getElementById('event-total-amount').textContent} items</span>
            </div>
            <div class="confirmation-item">
                <span class="confirmation-label">Preorder:</span>
                <span class="confirmation-value">Yes - Event Preorder</span>
            </div>
        </div>
    `;
    
    // Update form actions
    const formActions = document.querySelector('#event-preorder .form-actions');
    formActions.innerHTML = `
        <button type="button" class="btn btn-primary" onclick="showEventPreorder()">Make Another Event Booking</button>
    `;
}
