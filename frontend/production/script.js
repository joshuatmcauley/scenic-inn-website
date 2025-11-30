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
    
    // Populate event party size dropdown (1-100)
    populateEventPartySize();
    
    // Initialize step display - start with step 1
    currentStep = 1;
    updateStepDisplay();
    
    // Hide event preorder section initially
    const eventPreorder = document.getElementById('event-preorder');
    if (eventPreorder) {
        eventPreorder.style.display = 'none';
    }
}

// Populate event party size dropdown with options 1-100
function populateEventPartySize() {
    const select = document.getElementById('event-party-size');
    if (!select) return;
    
    // Clear existing options except the first one
    const firstOption = select.querySelector('option[value=""]');
    select.innerHTML = '';
    if (firstOption) {
        select.appendChild(firstOption);
    } else {
        // Add the placeholder option if it doesn't exist
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select party size';
        select.appendChild(placeholder);
    }
    
    // Add options from 1 to 100
    for (let i = 1; i <= 100; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} ${i === 1 ? 'person' : 'people'}`;
        select.appendChild(option);
    }
}

function setupEventListeners() {
    // Adults and children change
    const adultsSelect = document.getElementById('adults');
    const childrenSelect = document.getElementById('children');
    if (adultsSelect) {
        adultsSelect.addEventListener('change', handlePartySizeChange);
    }
    if (childrenSelect) {
        childrenSelect.addEventListener('change', handlePartySizeChange);
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
                // Show the menu(s) - will show selection if multiple, auto-select if single
                showSelectedMenu();
                // Load menu items will be called after menu is selected
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
    const adults = document.getElementById('adults').value;
    const children = document.getElementById('children').value;
    const date = document.getElementById('booking-date').value;
    const inputWrapper = document.querySelector('.party-input-wrapper');
    
    if (!adults || adults === '' || !date) {
        if (!adults || adults === '') {
            if (inputWrapper) {
                inputWrapper.style.borderColor = '#d63031';
            }
            showError('Please select number of guests');
        } else {
            showError('Please select a date');
        }
        return false;
    }
    
    // Calculate total party size
    const adultsCount = parseInt(adults) || 0;
    const childrenCount = parseInt(children) || 0;
    const totalPartySize = adultsCount + childrenCount;
    
    if (totalPartySize < 1) {
        if (inputWrapper) {
            inputWrapper.style.borderColor = '#d63031';
        }
        showError('Please select at least 1 adult');
        return false;
    }
    
    // Reset border color if valid
    if (inputWrapper) {
        inputWrapper.style.borderColor = '';
    }
    
    // Store data
    bookingData.adults = adultsCount;
    bookingData.children = childrenCount;
    bookingData.party_size = totalPartySize;
    bookingData.date = date;
    
    // Update hidden field for compatibility
    document.getElementById('party-size').value = totalPartySize;
    
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
    // Check if menu has been selected (required for multiple menus)
    if (!bookingData.experience_id) {
        // Check if we're in menu selection mode
        const menuChoiceSection = document.getElementById('menu-choice-section');
        if (menuChoiceSection && menuChoiceSection.style.display !== 'none') {
            alert('Please select a menu to continue');
            return false;
        }
    }
    return true;
}

async function showSelectedMenu() {
    const date = bookingData.date;
    let time = bookingData.time;
    
    if (!date || !time) {
        console.error('Date or time not available');
        return;
    }
    
    // Ensure time is in HH:MM format (remove any seconds or extra characters)
    time = time.split(':').slice(0, 2).join(':');
    
    // Get all available menus for this date and time (from database)
    const response = await fetch(`${API_BASE_URL}/menus/for-datetime/${date}/${time}`);
    const data = await response.json();
    
    if (!data.success || !data.data) {
        console.error('No menu available for this date and time');
        return;
    }
    
    // Check if multiple menus are available
    const menus = Array.isArray(data.data) ? data.data : [data.data];
    
    if (menus.length > 1) {
        // Show menu selection page
        showMenuSelection(menus);
    } else if (menus.length === 1) {
        // Single menu - auto-select it
        const menu = menus[0];
        // Use menu_id from the response (this is the actual database ID)
        bookingData.experience_id = menu.menu_id || menu.id;
        console.log('Set experience_id to:', bookingData.experience_id, 'from menu:', menu);
        
        // Get menu data from available experiences (database)
        const menuData = availableExperiences.find(exp => exp.id === menu.menu_id);
        
        if (menuData) {
            // Update the menu info card
            const menuNameElement = document.getElementById('selected-menu-name');
            const menuDescElement = document.getElementById('selected-menu-description');
            
            if (menuNameElement) {
                menuNameElement.textContent = menuData.name;
            }
            
            if (menuDescElement) {
                menuDescElement.textContent = menuData.description;
            }
        } else {
            // Use data from API response
            const menuNameElement = document.getElementById('selected-menu-name');
            const menuDescElement = document.getElementById('selected-menu-description');
            
            if (menuNameElement) {
                menuNameElement.textContent = menu.menu_name;
            }
            
            if (menuDescElement) {
                menuDescElement.textContent = menu.menu_schedule || 'Menu available for your selected time';
            }
        }
        
        // Show single menu section, hide menu choice section
        document.getElementById('menu-choice-section').style.display = 'none';
        document.getElementById('single-menu-section').style.display = 'block';
        document.getElementById('menu-instruction').textContent = 'Your menu has been automatically selected based on your date and time';
        
        // Show menu items if preorder is enabled
        if (bookingData.party_size >= 11 && bookingData.preorder_enabled) {
            // Load menu items first, then populate
            loadMenuItems();
        } else {
            // Just show a message that menu is determined
            const menuSelection = document.getElementById('menu-selection');
            if (menuSelection) {
                menuSelection.innerHTML = `
                    <div class="menu-confirmation">
                        <p><strong>Your menu has been automatically selected:</strong></p>
                        <p>Based on your selected date and time, you will be served from the <strong>${menu.menu_name}</strong>.</p>
                        <p>${menu.menu_schedule || ''}</p>
                    </div>
                `;
            }
        }
    }
}

// Show menu selection when multiple menus are available
function showMenuSelection(menus) {
    const menuChoiceSection = document.getElementById('menu-choice-section');
    const singleMenuSection = document.getElementById('single-menu-section');
    const menuInstruction = document.getElementById('menu-instruction');
    const availableMenusList = document.getElementById('available-menus-list');
    const continueBtn = document.getElementById('continue-menu-btn');
    
    // Show menu choice section, hide single menu section
    menuChoiceSection.style.display = 'block';
    singleMenuSection.style.display = 'none';
    menuInstruction.textContent = 'Multiple menus are available. Please select one:';
    
    // Disable continue button until menu is selected
    continueBtn.disabled = true;
    continueBtn.style.opacity = '0.5';
    continueBtn.style.cursor = 'not-allowed';
    
    // Clear any previous selection
    bookingData.experience_id = null;
    
    // Populate menu options
    availableMenusList.innerHTML = menus.map((menu, index) => {
        const menuData = availableExperiences.find(exp => exp.id === menu.menu_id);
        const menuName = menuData ? menuData.name : menu.menu_name;
        const menuDesc = menuData ? menuData.description : (menu.menu_schedule || 'Available for your selected time');
        
        return `
            <div class="menu-option-card" onclick="selectMenu('${menu.menu_id}', ${index})" data-menu-id="${menu.menu_id}">
                <h3>${menuName}</h3>
                <p>${menuDesc}</p>
                ${menu.menu_schedule ? `<p class="menu-schedule-info">${menu.menu_schedule}</p>` : ''}
            </div>
        `;
    }).join('');
}

// Handle menu selection
function selectMenu(menuId, index) {
    // Remove selected class from all cards
    document.querySelectorAll('.menu-option-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    const selectedCard = document.querySelector(`.menu-option-card[data-menu-id="${menuId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Store selected menu
    bookingData.experience_id = menuId;
    console.log('User selected menu:', menuId);
    
    // Enable continue button
    const continueBtn = document.getElementById('continue-menu-btn');
    continueBtn.disabled = false;
    continueBtn.style.opacity = '1';
    continueBtn.style.cursor = 'pointer';
    
    // Get menu data and update display
    const menuData = availableExperiences.find(exp => exp.id === menuId);
    if (menuData) {
        // Update the menu info card (if visible)
        const menuNameElement = document.getElementById('selected-menu-name');
        const menuDescElement = document.getElementById('selected-menu-description');
        
        if (menuNameElement) {
            menuNameElement.textContent = menuData.name;
        }
        
        if (menuDescElement) {
            menuDescElement.textContent = menuData.description;
        }
    }
    
    // Show menu items if preorder is enabled
    if (bookingData.party_size >= 11 && bookingData.preorder_enabled) {
        // Show single menu section with menu items
        document.getElementById('menu-choice-section').style.display = 'none';
        document.getElementById('single-menu-section').style.display = 'block';
        
        // Load menu items for selected menu
        loadMenuItems();
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

// Open party selector popup
function openPartySelector() {
    const popup = document.getElementById('party-selector-popup');
    const inputWrapper = document.querySelector('.party-input-wrapper');
    popup.classList.add('active');
    if (inputWrapper) {
        inputWrapper.classList.add('active');
    }
    // Prevent body scroll when popup is open
    document.body.style.overflow = 'hidden';
}

// Close party selector popup
function closePartySelector() {
    const popup = document.getElementById('party-selector-popup');
    const inputWrapper = document.querySelector('.party-input-wrapper');
    popup.classList.remove('active');
    if (inputWrapper) {
        inputWrapper.classList.remove('active');
    }
    document.body.style.overflow = '';
    
    // Validate that at least 1 adult is selected
    const adults = parseInt(document.getElementById('adults').value) || 0;
    if (adults === 0) {
        document.getElementById('party-composition-input').value = '';
    }
}

// Update party size from adults and children
function updatePartySize() {
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const children = parseInt(document.getElementById('children').value) || 0;
    const total = adults + children;
    
    // Update hidden field
    document.getElementById('party-size').value = total;
    
    // Update the input display
    const input = document.getElementById('party-composition-input');
    if (adults > 0) {
        let displayText = `${adults} adult${adults !== 1 ? 's' : ''}`;
        if (children > 0) {
            displayText += `, ${children} child${children !== 1 ? 'ren' : ''}`;
        }
        input.value = displayText;
    } else {
        input.value = '';
    }
    
    // Trigger party size change handler
    handlePartySizeChange();
}

// Close popup when clicking outside
document.addEventListener('click', function(event) {
    const popup = document.getElementById('party-selector-popup');
    const inputWrapper = document.querySelector('.party-input-wrapper');
    
    if (popup && popup.classList.contains('active')) {
        if (!popup.contains(event.target) && !inputWrapper.contains(event.target)) {
            closePartySelector();
        }
    }
});

// Event Handlers
function handlePartySizeChange() {
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const children = parseInt(document.getElementById('children').value) || 0;
    const totalPartySize = adults + children;
    
    // Update bookingData immediately
    bookingData.adults = adults;
    bookingData.children = children;
    bookingData.party_size = totalPartySize;
    const notice = document.getElementById('large-party-notice');
    const preorderToggle = document.getElementById('enable-preorder');
    
    if (totalPartySize >= 11) {
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
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const children = parseInt(document.getElementById('children').value) || 0;
    const totalPartySize = adults + children;
    
    // Update bookingData with current adults and children counts
    bookingData.adults = adults;
    bookingData.children = children;
    bookingData.party_size = totalPartySize;
    
    if (preorderToggle && preorderInfo) {
        if (preorderToggle.checked) {
            preorderInfo.style.display = 'block';
            bookingData.preorder_enabled = true;
            // Update menu instruction
            const instruction = document.getElementById('menu-instruction');
            if (instruction) {
                instruction.textContent = `Select meals for each of the ${totalPartySize} people in your party`;
            }
            // Reload menu selection to show children first
            if (bookingData.experience_id) {
                populateMenuSelection();
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
        
        if (response.ok && data && data.success && data.data) {
            // Convert menu data to experience format
            availableExperiences = data.data.map(menu => {
                let price = null;
                if (menu.pricing) {
                    if (typeof menu.pricing === 'string') {
                        try {
                            price = JSON.parse(menu.pricing);
                        } catch (e) {
                            console.warn(`Invalid JSON in pricing for menu ${menu.id}:`, menu.pricing);
                            price = null;
                        }
                    } else {
                        price = menu.pricing;
                    }
                }
                return {
                    id: menu.id,
                    name: menu.name,
                    description: menu.schedule,
                    price: price
                };
            });
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
        console.log('Response status:', response.status, 'OK:', response.ok);
        
        if (response.ok && data && data.success !== false) {
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
                        comes_with_side: item.comes_with_side,
                        is_steak: item.is_steak
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
                            pricing_type: item.pricing_type,
                            comes_with_side: item.comes_with_side,
                            is_steak: item.is_steak
                        }))
                    }))
                };
            }
            
            // Store pricing information
            if (pricingResponse.ok && pricingData.success) {
                menuItems.pricing_info = pricingData.data;
            }
            
            console.log('Menu items loaded:', menuItems);
            
            // Check if we actually have items
            if (!menuItems.categories || menuItems.categories.length === 0) {
                console.warn('No menu items found in response');
                showError('No menu items available for this menu. Please contact support.');
                return;
            }
            
            populateMenuSelection();
        } else {
            console.error('Failed to load menu items. Status:', response.status, 'Data:', data);
            showError(data.message || 'Failed to load menu items. Please try again or contact support.');
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

async function populateMenuSelection() {
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
    
    // Party size is now always >= 11 (minimum enforced in HTML)
    // All bookings now support preorders
    
    if (!bookingData.preorder_enabled) {
        container.innerHTML = '<p class="text-center">Preorder is not enabled for this booking. You can order when you arrive.</p>';
        return;
    }
    
    // Determine adults and children counts - read directly from form inputs
    const adultsInput = document.getElementById('adults');
    const childrenInput = document.getElementById('children');
    const adultsCount = adultsInput ? parseInt(adultsInput.value) || 0 : (bookingData.adults || bookingData.party_size || 0);
    const childrenCount = childrenInput ? parseInt(childrenInput.value) || 0 : (bookingData.children || 0);
    
    // Update bookingData with current values
    bookingData.adults = adultsCount;
    bookingData.children = childrenCount;
    bookingData.party_size = adultsCount + childrenCount;
    
    console.log('populateMenuSelection - Adults:', adultsCount, 'Children:', childrenCount, 'Total:', adultsCount + childrenCount);
    
    // Load kids menu items if there are children
    let kidsMenuItems = null;
    if (childrenCount > 0) {
        console.log('Loading kids menu items...');
        await loadKidsMenuItems();
        kidsMenuItems = window.kidsMenuItems || null;
        console.log('Kids menu items loaded:', kidsMenuItems ? 'Yes' : 'No', kidsMenuItems);
    }
    
    // Create menu selection for each person
    let personIndex = 1;
    
    // Add children FIRST with kids menu (so they appear at the top)
    console.log('Adding children first, count:', childrenCount);
    for (let i = 1; i <= childrenCount; i++) {
        const personDiv = document.createElement('div');
        personDiv.className = 'person-menu person-menu-child';
        personDiv.innerHTML = `
            <div class="person-header">
                <div class="person-avatar person-avatar-child">🧒</div>
                <div class="person-name">Child ${i}</div>
                <input type="text" 
                       class="person-name-input" 
                       id="person-${personIndex}-name" 
                       name="person-${personIndex}-name" 
                       placeholder="Enter name (optional)" 
                       maxlength="50">
            </div>
            <div class="menu-categories">
                ${generateMenuCategories(personIndex, true, kidsMenuItems)}
            </div>
        `;
        container.appendChild(personDiv);
        personIndex++;
    }
    
    // Add adults AFTER children
    console.log('Adding adults after children, count:', adultsCount);
    for (let i = 1; i <= adultsCount; i++) {
        const personDiv = document.createElement('div');
        personDiv.className = 'person-menu';
        personDiv.innerHTML = `
            <div class="person-header">
                <div class="person-avatar">${personIndex}</div>
                <div class="person-name">Adult ${i}</div>
                <input type="text" 
                       class="person-name-input" 
                       id="person-${personIndex}-name" 
                       name="person-${personIndex}-name" 
                       placeholder="Enter name (optional)" 
                       maxlength="50">
            </div>
            <div class="menu-categories">
                ${generateMenuCategories(personIndex, false)}
            </div>
        `;
        container.appendChild(personDiv);
        personIndex++;
    }
}

// Load kids menu items
async function loadKidsMenuItems() {
    try {
        // Determine which kids menu to load based on the current experience/menu
        let kidsMenuId = 'kids-menu'; // Default kids menu
        
        // Check if we're on a Christmas menu - use the corresponding kids Christmas menu
        if (bookingData.experience_id === 'christmas-dinner') {
            kidsMenuId = 'kids-christmas-dinner';
        } else if (bookingData.experience_id === 'christmas-lunch') {
            kidsMenuId = 'kids-christmas-lunch';
        }
        
        console.log('Loading kids menu:', kidsMenuId, 'for experience:', bookingData.experience_id);
        
        const response = await fetch(`${API_BASE_URL}/menus/${kidsMenuId}/items?forPreorder=true`);
        let data = await response.json();
        
        if (response.ok && data && data.success !== false) {
            let raw = Array.isArray(data) ? data : (data.data || []);
            
            if (raw.length > 0 && raw[0].section_key) {
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
                        comes_with_side: item.comes_with_side || false,
                        is_steak: false // Kids menu won't have steaks
                    });
                });
                window.kidsMenuItems = { categories: Object.values(grouped) };
            } else {
                window.kidsMenuItems = {
                    categories: raw.map(section => ({
                        name: (section.section_key || section.name || '').toString().toLowerCase(),
                        items: (section.items || []).map(item => ({
                            id: item.id,
                            name: item.name,
                            description: item.description || '',
                            price: item.price,
                            comes_with_side: item.comes_with_side || false,
                            is_steak: false
                        }))
                    }))
                };
            }
        } else {
            console.warn('Failed to load kids menu items');
            window.kidsMenuItems = null;
        }
    } catch (error) {
        console.error('Error loading kids menu items:', error);
        window.kidsMenuItems = null;
    }
}

function generateMenuCategories(personNumber, isChild = false, kidsMenuData = null) {
    // Use kids menu if this is a child
    const itemsToUse = isChild && kidsMenuData ? kidsMenuData : menuItems;
    
    console.log(`generateMenuCategories for person ${personNumber}:`, {
        isChild,
        hasKidsMenuData: !!kidsMenuData,
        usingKidsMenu: isChild && kidsMenuData,
        itemsToUse: itemsToUse ? Object.keys(itemsToUse) : null,
        categories: itemsToUse?.categories?.length || 0
    });
    
    if (!itemsToUse || !itemsToUse.categories) {
        console.warn(`No menu items available for person ${personNumber}, isChild: ${isChild}`);
        return '<p>No menu items available</p>';
    }
    
    // Group items by course type using EXACT section keys from database
    const starters = [];
    const mains = [];
    const desserts = [];
    const sides = [];
    
    itemsToUse.categories.forEach(category => {
        const sectionKey = category.name; // Use exact case from database
        
        console.log(`Processing section: "${sectionKey}" with ${category.items.length} items`);
        
        // Starters - exact matches (kids menu typically doesn't have starters)
        if (!isChild && (sectionKey === 'starters' || sectionKey === 'light-bites')) {
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
        // Sides - separate category (for kids menu, sides are usually included with mains)
        else if (sectionKey === 'sides' || sectionKey === 'side-orders' || sectionKey === 'dips' || sectionKey === 'sauces') {
            // For kids menu, we might want to show sides separately or include them
            if (isChild) {
                // For kids, sides are usually included, but we can show them if needed
                sides.push(...category.items);
            } else {
                sides.push(...category.items);
            }
            console.log(`  → Added to sides: ${category.items.map(item => item.name).join(', ')}`);
        }
        // Specials - separate category (for special offers, chef's specials, etc.)
        else if (sectionKey === 'specials') {
            // Specials can be shown separately or grouped with mains depending on your preference
            // For now, we'll add them to mains but log them separately
            if (!isChild) {
                mains.push(...category.items);
                console.log(`  → Added to mains (specials): ${category.items.map(item => item.name).join(', ')}`);
            }
        }
        else {
            console.warn(`  → Unknown section key: "${sectionKey}" - defaulting to mains`);
            mains.push(...category.items);
        }
    });
    
    // Check if there are any desserts or sides available
    const hasDesserts = desserts.length > 0;
    const hasSides = sides.length > 0;
    
    // Add pricing information header (only for adults)
    const pricingInfo = !isChild ? getPricingInfoDisplay() : '';
    
    // Kids menu typically doesn't have starters, just main and maybe dessert
    const showStarters = !isChild && starters.length > 0;
    
    return `
        <div class="course-selection">
            ${pricingInfo}
            ${showStarters ? `
            <div class="course-group">
                <label for="person-${personNumber}-starter">Starter:</label>
                <select id="person-${personNumber}-starter" name="person-${personNumber}-starter">
                    <option value="">Select a starter</option>
                    ${starters.map(item => `
                        <option value="${item.id}">${item.name}${getItemPriceDisplay(item)}</option>
                    `).join('')}
                </select>
            </div>
            ` : ''}
            
            <div class="course-group">
                <label for="person-${personNumber}-main">${isChild ? 'Main Meal:' : 'Main Course:'}</label>
                <select id="person-${personNumber}-main" name="person-${personNumber}-main" onchange="toggleSideDropdown(${personNumber}); toggleSteakRarity(${personNumber})">
                    <option value="">Select a ${isChild ? 'meal' : 'main course'}</option>
                    ${mains.map(item => `
                        <option value="${item.id}" data-comes-with-side="${item.comes_with_side || false}" data-is-steak="${item.is_steak || false}">${item.name}${getItemPriceDisplay(item, isChild)}</option>
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
                        <option value="${item.id}">${item.name}${getItemPriceDisplay(item, isChild)}</option>
                    `).join('')}
                </select>
            </div>
            ` : ''}
            
            ${isChild ? '<input type="hidden" id="person-' + personNumber + '-is-child" value="true">' : ''}
            
            <div class="course-group">
                <label for="person-${personNumber}-notes">Special Instructions/Notes:</label>
                <textarea id="person-${personNumber}-notes" name="person-${personNumber}-notes" 
                    placeholder="${isChild ? 'Any dietary requirements, allergies, or special requests for this child...' : 'Any dietary requirements, allergies, or special requests for this person...'}" 
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
        // Individual pricing info is already shown at the top, no need to repeat for each person
        return '';
    }
    
    return '';
}

// Helper function to display item pricing based on menu pricing type
function getItemPriceDisplay(item, isKidsMenu = false) {
    // Kids menu always shows prices (individual pricing)
    if (isKidsMenu) {
        return item.price ? ` - £${item.price}` : '';
    }
    
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
    const adultsCount = bookingData.adults || bookingData.party_size;
    const childrenCount = bookingData.children || 0;
    
    let personIndex = 1;
    
    // Collect data for children FIRST (matching the display order)
    for (let i = 1; i <= childrenCount; i++) {
        const items = [];
        
        // Get main course selection (kids menu)
        const mainSelect = document.getElementById(`person-${personIndex}-main`);
        if (mainSelect && mainSelect.value) {
            let itemName = mainSelect.options[mainSelect.selectedIndex]?.text || '';
            itemName = itemName.replace(/\s*-\s*£?\d+(?:[.,]\d{1,2})?\s*$/i, '').trim();
            
            items.push({
                menu_item_id: mainSelect.value,
                course_type: 'main',
                item_name: itemName,
                quantity: 1,
                special_instructions: '',
                is_kids_menu: true
            });
        }
        
        // Get dessert selection (if available)
        const dessertSelect = document.getElementById(`person-${personIndex}-dessert`);
        if (dessertSelect && dessertSelect.value) {
            items.push({
                menu_item_id: dessertSelect.value,
                course_type: 'dessert',
                item_name: dessertSelect.options[dessertSelect.selectedIndex]?.text || '',
                quantity: 1,
                special_instructions: '',
                is_kids_menu: true
            });
        }
        
        // Get notes for this child
        const notesElement = document.getElementById(`person-${personIndex}-notes`);
        const personNotes = notesElement ? notesElement.value.trim() : '';
        
        // Get person name (optional)
        const nameElement = document.getElementById(`person-${personIndex}-name`);
        const personName = nameElement ? nameElement.value.trim() : '';
        
        if (items.length > 0 || personNotes) {
            preorderData.push({
                person_number: personIndex,
                person_name: personName || null,
                is_child: true,
                items: items,
                special_instructions: personNotes
            });
        }
        personIndex++;
    }
    
    // Collect data for adults AFTER children
    for (let i = 1; i <= adultsCount; i++) {
        const items = [];
        
        // Get starter selection
        const starterSelect = document.getElementById(`person-${personIndex}-starter`);
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
        const mainSelect = document.getElementById(`person-${personIndex}-main`);
        if (mainSelect && mainSelect.value) {
            let itemName = mainSelect.options[mainSelect.selectedIndex]?.text || '';
            
            // Remove price from item name (for steaks especially)
            itemName = itemName.replace(/\s*-\s*£?\d+(?:[.,]\d{1,2})?\s*$/i, '').trim();
            
            // Check if this is a steak and get rarity
            const steakRaritySelect = document.getElementById(`person-${personIndex}-steak-rarity`);
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
        const sideSelect = document.getElementById(`person-${personIndex}-side`);
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
        const dessertSelect = document.getElementById(`person-${personIndex}-dessert`);
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
        const notesElement = document.getElementById(`person-${personIndex}-notes`);
        const personNotes = notesElement ? notesElement.value.trim() : '';
        
        // Get person name (optional)
        const nameElement = document.getElementById(`person-${personIndex}-name`);
        const personName = nameElement ? nameElement.value.trim() : '';
        
        if (items.length > 0 || personNotes) {
            preorderData.push({
                person_number: personIndex,
                person_name: personName || null,
                is_child: false,
                items: items,
                special_instructions: personNotes
            });
        }
        personIndex++;
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
            <span class="confirmation-value">${bookingData.party_size} ${bookingData.party_size === 1 ? 'person' : 'people'}${bookingData.adults !== undefined ? ` (${bookingData.adults} adult${bookingData.adults !== 1 ? 's' : ''}${bookingData.children > 0 ? `, ${bookingData.children} child${bookingData.children !== 1 ? 'ren' : ''}` : ''})` : ''}</span>
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
    
    // Load buffet menu items immediately (buffet is always available, not date/time dependent)
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
    
    // Note: Menu items are already loaded (buffet menu is always available)
    // No need to reload menu items when date/time changes
}

function handleEventTimeChange() {
    // Note: Menu items are already loaded (buffet menu is always available)
    // No need to reload menu items when date/time changes
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
    // Event/Buffet preorder always uses the buffet menu, regardless of date/time
    const selectedMenuId = 'buffet';
    
    try {
        showLoading(true);
        
        // Fetch menu info
        const menuInfoResponse = await fetch(`${API_BASE_URL}/menus/${selectedMenuId}`);
        let menuInfoData = await menuInfoResponse.json();
        console.log('Menu info response:', menuInfoData);
        
        // Fetch menu items for preorder (buffet menu)
        console.log('Fetching event/buffet menu items from:', `${API_BASE_URL}/menus/${selectedMenuId}/items?forPreorder=true`);
        const response = await fetch(`${API_BASE_URL}/menus/${selectedMenuId}/items?forPreorder=true`);
        let data = await response.json();
        console.log('Event menu items response:', data);
        
        if (response.ok && data && data.success !== false) {
            // Handle both shapes: { success, data: [...] } or direct array
            let raw = Array.isArray(data) ? data : (data.data || []);

            // Transform flat list of items with section_key/section_name into categories
            if (raw.length > 0 && raw[0].section_key) {
                const grouped = {};
                raw.forEach(item => {
                    const sectionKey = (item.section_key || '').toString().toLowerCase();
                    // Format section name: use section_name if available, otherwise format section_key
                    let sectionName = item.section_name;
                    if (!sectionName && item.section_key) {
                        // Convert "section-key" to "Section Key"
                        sectionName = item.section_key
                            .split('-')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(' ');
                    }
                    if (!sectionName) {
                        sectionName = sectionKey;
                    }
                    
                    if (!grouped[sectionKey]) {
                        grouped[sectionKey] = { 
                            name: sectionName, 
                            items: [] 
                        };
                    }
                    
                    // Format price for display
                    let priceDisplay = '';
                    if (item.price && parseFloat(item.price) > 0) {
                        priceDisplay = `£${parseFloat(item.price).toFixed(2)}`;
                    } else {
                        priceDisplay = 'Included';
                    }
                    
                    grouped[sectionKey].items.push({
                        id: item.id,
                        name: item.name,
                        description: item.description || '',
                        price: priceDisplay,
                        priceValue: parseFloat(item.price) || 0
                    });
                });
                menuItems = { categories: Object.values(grouped) };
                console.log('Event menu items grouped:', menuItems);
            } else {
                // Already grouped by sections with items
                menuItems = {
                    categories: raw.map(section => ({
                        name: section.section_name || section.name || section.section_key || 'Items',
                        items: (section.items || []).map(item => {
                            let priceDisplay = '';
                            if (item.price && parseFloat(item.price) > 0) {
                                priceDisplay = `£${parseFloat(item.price).toFixed(2)}`;
                            } else {
                                priceDisplay = 'Included';
                            }
                            return {
                                id: item.id,
                                name: item.name,
                                description: item.description || '',
                                price: priceDisplay,
                                priceValue: parseFloat(item.price) || 0
                            };
                        })
                    }))
                };
            }
            
            // Store menu info
            if (menuInfoResponse.ok && menuInfoData.success) {
                menuItems.menuInfo = menuInfoData.data;
            }
            
            console.log('Event menu items loaded:', menuItems);
            
            // Check if we actually have items
            if (!menuItems.categories || menuItems.categories.length === 0) {
                console.warn('No menu items found in response');
                showError('No menu items available for this menu. Please contact support.');
                return;
            }
            
            populateEventMenuSelection();
            
            // Show which menu is being displayed
            showMenuInfo(selectedMenuId, menuItems.menuInfo);
        } else {
            console.error('Failed to load event menu items. Status:', response.status, 'Data:', data);
            showError(data.message || 'Failed to load menu items. Please try again or contact support.');
        }
    } catch (error) {
        console.error('Error loading event menu items:', error);
        showError('Failed to load menu items');
    } finally {
        showLoading(false);
    }
}

// Get menu for date/time from database schedule rules
// Returns the first available menu ID (for backward compatibility)
// Note: Use showSelectedMenu() for full menu selection with multiple menu support
async function getMenuForDateTime(date, time) {
    try {
        // Ensure time is in HH:MM format
        time = time.split(':').slice(0, 2).join(':');
        console.log(`Checking menu for: ${date} at ${time}`);
        
        const response = await fetch(`${API_BASE_URL}/menus/for-datetime/${date}/${time}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            // Handle both single menu object and array of menus
            const menus = Array.isArray(data.data) ? data.data : [data.data];
            if (menus.length > 0) {
                console.log('Selected menu from database:', menus[0].menu_name, '(ID:', menus[0].menu_id + ')');
                return menus[0].menu_id;
            }
        }
        
        console.log('No menu available for this date and time');
        return null;
    } catch (error) {
        console.error('Error fetching menu from schedule rules:', error);
        // Fallback to hardcoded logic if API fails
        return getMenuForDateTimeFallback(date, time);
    }
}

// Fallback function with hardcoded logic (used if database lookup fails)
function getMenuForDateTimeFallback(date, time) {
    const bookingDate = new Date(date);
    const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = parseInt(time.split(':')[0]);
    const minute = parseInt(time.split(':')[1]);
    const timeInMinutes = hour * 60 + minute;
    
    console.log(`Using fallback logic for: ${date} (day ${dayOfWeek}) at ${time} (${timeInMinutes} minutes)`);
    
    // Sunday Lunch Menu: Sunday 12pm-5pm (PRIORITY - check first for Sunday)
    if (dayOfWeek === 0 && 
        (timeInMinutes >= 12 * 60 && timeInMinutes <= 17 * 60)) {
        console.log('Selected: Sunday Lunch Menu (fallback)');
        return 'sunday-lunch';
    }
    
    // Weekend Evening Menu: Friday, Saturday, Sunday 5pm-9pm
    if ((dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) && 
        (timeInMinutes >= 17 * 60 && timeInMinutes <= 21 * 60)) {
        console.log('Selected: Weekend Evening Menu (fallback)');
        return 'weekend-evening';
    }
    
    // Tea Time Menu: Monday-Thursday 5pm-8.30pm
    if ((dayOfWeek >= 1 && dayOfWeek <= 4) && 
        (timeInMinutes >= 17 * 60 && timeInMinutes <= 20 * 60 + 30)) {
        console.log('Selected: Tea Time Menu (fallback)');
        return 'tea-time';
    }
    
    // Lunch Menu: Monday-Saturday 12pm-4.45pm (NOT Sunday)
    if ((dayOfWeek >= 1 && dayOfWeek <= 6) && 
        (timeInMinutes >= 12 * 60 && timeInMinutes <= 16 * 60 + 45)) {
        console.log('Selected: Lunch Menu (fallback)');
        return 'lunch';
    }
    
    console.log('No menu available for this date and time (fallback)');
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

function showMenuInfo(menuId, menuData) {
    // Create or update menu info display
    let menuInfo = document.getElementById('menu-info');
    if (!menuInfo) {
        menuInfo = document.createElement('div');
        menuInfo.id = 'menu-info';
        menuInfo.className = 'menu-info';
        
        const container = document.getElementById('event-menu-selection');
        if (container && container.parentNode) {
            container.parentNode.insertBefore(menuInfo, container);
        }
    }
    
    // If menuData is provided, use it; otherwise fetch it
    if (menuData) {
        const menuName = menuData.name || menuId;
        const menuDescription = menuData.description || menuData.schedule || '';
        
        menuInfo.innerHTML = `
            <div class="menu-info-card">
                <h3>${menuName}</h3>
                ${menuDescription ? `<p>${menuDescription}</p>` : ''}
            </div>
        `;
    } else if (menuId) {
        // Fetch menu info if not provided
        fetch(`${API_BASE_URL}/menus/${menuId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data) {
                    const menuName = data.data.name || menuId;
                    const menuDescription = data.data.description || data.data.schedule || '';
                    menuInfo.innerHTML = `
                        <div class="menu-info-card">
                            <h3>${menuName}</h3>
                            ${menuDescription ? `<p>${menuDescription}</p>` : ''}
                        </div>
                    `;
                }
            })
            .catch(err => {
                console.error('Error fetching menu info:', err);
                // Show menu ID as fallback
                menuInfo.innerHTML = `
                    <div class="menu-info-card">
                        <h3>${menuId}</h3>
                    </div>
                `;
            });
    }
}

function populateEventMenuSelection() {
    const container = document.getElementById('event-menu-selection');
    container.innerHTML = '';
    
    if (!menuItems.categories) {
        container.innerHTML = '<p class="text-center">No menu items available</p>';
        return;
    }
    
    // Collect all buffet items from all categories into a single list
    const allItems = [];
    menuItems.categories.forEach(category => {
        category.items.forEach(item => {
            allItems.push(item);
        });
    });
    
    if (allItems.length === 0) {
        container.innerHTML = '<p class="text-center">No menu items available</p>';
        return;
    }
    
    // Create the "How many different items?" dropdown
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    formGroup.innerHTML = `
        <label for="buffet-item-count">How many different items?</label>
        <select id="buffet-item-count" name="buffet_item_count" onchange="handleBuffetItemCountChange()">
            <option value="">Select number of items</option>
            <option value="1">1 item</option>
            <option value="2">2 items</option>
            <option value="3">3 items</option>
            <option value="4">4 items</option>
        </select>
    `;
    container.appendChild(formGroup);
    
    // Container for item selection dropdowns
    const itemsContainer = document.createElement('div');
    itemsContainer.id = 'buffet-items-container';
    itemsContainer.className = 'buffet-items-container';
    container.appendChild(itemsContainer);
}

function handleBuffetItemCountChange() {
    const count = parseInt(document.getElementById('buffet-item-count').value);
    const container = document.getElementById('buffet-items-container');
    
    if (!count || count < 1 || count > 4) {
        container.innerHTML = '';
        return;
    }
    
    // Get all buffet items
    const allItems = [];
    if (menuItems.categories) {
        menuItems.categories.forEach(category => {
            category.items.forEach(item => {
                allItems.push(item);
            });
        });
    }
    
    // Clear existing dropdowns
    container.innerHTML = '';
    
    // Create dropdowns for each item selection
    for (let i = 1; i <= count; i++) {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.innerHTML = `
            <label for="buffet-item-${i}">Item ${i}:</label>
            <select id="buffet-item-${i}" name="buffet_item_${i}" onchange="handleBuffetItemChange(${i})">
                <option value="">Select an item</option>
                ${allItems.map(item => `
                    <option value="${item.id}" data-price="${item.priceValue || 0}">${item.name}${item.price && item.price !== 'Included' ? ' - ' + item.price : ''}</option>
                `).join('')}
            </select>
        `;
        container.appendChild(formGroup);
    }
}

function handleBuffetItemChange(itemNumber) {
    // Optional: Add any validation or price calculation here if needed
    console.log(`Buffet item ${itemNumber} selected`);
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
    
    // Collect customer details
    const firstName = document.getElementById('event-first-name').value.trim();
    const lastName = document.getElementById('event-last-name').value.trim();
    const email = document.getElementById('event-email').value.trim();
    const phone = document.getElementById('event-phone').value.trim();
    const specialRequests = document.getElementById('event-special-requests').value.trim();
    const marketingConsent = document.getElementById('event-marketing-consent').checked;
    
    // Validate customer details
    if (!firstName || !lastName || !email || !phone) {
        showError('Please fill in all contact details');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    // Event/Buffet preorder always uses the buffet menu
    const experienceId = 'buffet';
    
    // Get number of items selected
    const itemCount = parseInt(document.getElementById('buffet-item-count').value);
    if (!itemCount || itemCount < 1 || itemCount > 4) {
        showError('Please select how many different items you want (1-4)');
        return;
    }
    
    // Collect preorder data from dropdowns
    const preorderData = [];
    const selectedItems = new Set(); // Track to prevent duplicates
    
    for (let i = 1; i <= itemCount; i++) {
        const select = document.getElementById(`buffet-item-${i}`);
        if (!select || !select.value) {
            showError(`Please select item ${i}`);
            return;
        }
        
        const itemId = select.value;
        
        // Check for duplicates
        if (selectedItems.has(itemId)) {
            showError('Please select different items (no duplicates allowed)');
            return;
        }
        selectedItems.add(itemId);
        
        preorderData.push({
            menu_item_id: itemId,
            quantity: partySize, // Quantity is the party size (all people get this item)
            special_instructions: ''
        });
    }
    
    if (preorderData.length === 0) {
        showError('Please select at least one item for your event');
        return;
    }
    
    // Prepare booking data (matching backend expected format)
    eventBookingData = {
        partySize: partySize,
        party_size: partySize, // Support both formats
        experience_id: experienceId,
        date: date,
        time: time,
        firstName: firstName,
        first_name: firstName, // Support both formats
        lastName: lastName,
        last_name: lastName, // Support both formats
        email: email, // Customer's email from form
        phone: phone,
        specialRequests: specialRequests || '',
        special_requests: specialRequests || '', // Support both formats
        marketing_consent: marketingConsent,
        preorder_enabled: true,
        preorder: [{
            person_number: 1,
            items: preorderData
        }]
    };
    
    // Debug: Log the email being sent
    console.log('📧 Event booking data being sent:', {
        email: eventBookingData.email,
        firstName: eventBookingData.firstName,
        lastName: eventBookingData.lastName,
        date: eventBookingData.date,
        time: eventBookingData.time
    });
    
    try {
        showLoading(true);
        
        // Format data for backend (backend accepts bookingData directly or wrapped)
        // Send in same format as regular booking for consistency
        const response = await fetch(`${API_BASE_URL}/booking-submission`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventBookingData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showEventConfirmation(result);
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

function showEventConfirmation(result) {
    const container = document.getElementById('event-menu-selection');
    const bookingRef = result.bookingReference || result.booking?.id || 'EVENT-' + Date.now();
    
    // Count total items selected
    const itemCount = parseInt(document.getElementById('buffet-item-count').value) || 0;
    
    container.innerHTML = `
        <div class="confirmation-details">
            <h2 style="color: #4CAF50; text-align: center; margin-bottom: 20px;">🎉 Event Preorder Confirmed!</h2>
            <p style="text-align: center; margin-bottom: 20px; color: #666;">
                A confirmation email has been sent to ${eventBookingData.email}
            </p>
            <div class="confirmation-item">
                <span class="confirmation-label">Booking Reference:</span>
                <span class="confirmation-value">${bookingRef}</span>
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
                <span class="confirmation-label">Items Selected:</span>
                <span class="confirmation-value">${itemCount} different items</span>
            </div>
            <div class="confirmation-item">
                <span class="confirmation-label">Contact:</span>
                <span class="confirmation-value">${eventBookingData.first_name} ${eventBookingData.last_name} - ${eventBookingData.email}</span>
            </div>
            ${eventBookingData.special_requests ? `
            <div class="confirmation-item">
                <span class="confirmation-label">Special Requests:</span>
                <span class="confirmation-value">${eventBookingData.special_requests}</span>
            </div>
            ` : ''}
            <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <p style="margin: 0; color: #666; text-align: center;">
                    <strong>What happens next?</strong><br>
                    We've received your event preorder and will prepare everything for your arrival. 
                    A detailed preorder PDF has been sent to the restaurant, and you'll receive a confirmation email shortly.
                </p>
            </div>
        </div>
    `;
    
    // Hide the form and show confirmation
    const form = document.querySelector('#event-preorder form');
    if (form) {
        form.style.display = 'none';
    }
    
    // Update form actions
    const formActions = document.querySelector('#event-preorder .form-actions');
    if (formActions) {
        formActions.innerHTML = `
            <button type="button" class="btn btn-primary" onclick="showEventPreorder()">Make Another Event Booking</button>
        `;
    }
}

