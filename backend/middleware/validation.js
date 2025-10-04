const Joi = require('joi');

// Validation schema for booking data
const bookingSchema = Joi.object({
  // Customer details
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).required(),
  
  // Booking details
  party_size: Joi.number().integer().min(1).max(50).required(),
  date: Joi.date().iso().required(),
  time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  experience_id: Joi.string().required(),
  
  // Optional fields
  special_requests: Joi.string().max(500).allow(''),
  marketing_consent: Joi.boolean().default(false),
  
  // Preorder data (optional for 11+ people)
  preorder: Joi.array().items(
    Joi.object({
      person_number: Joi.number().integer().min(1).required(),
      items: Joi.array().items(
        Joi.object({
          menu_item_id: Joi.string().required(),
          quantity: Joi.number().integer().min(1).max(10).required(),
          special_instructions: Joi.string().max(200).allow('')
        })
      ).min(1).required()
    })
  ).optional(),
  
  // Preorder enabled flag
  preorder_enabled: Joi.boolean().optional()
});

// Validation schema for preorder data
const preorderSchema = Joi.object({
  person_number: Joi.number().integer().min(1).required(),
  items: Joi.array().items(
    Joi.object({
      menu_item_id: Joi.string().required(),
      quantity: Joi.number().integer().min(1).max(10).required(),
      special_instructions: Joi.string().max(200).allow('')
    })
  ).min(1).required()
});

// Middleware to validate booking data
const validateBookingData = (req, res, next) => {
  const { error, value } = bookingSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json({
      error: 'Validation failed',
      messages: errorMessages
    });
  }

  req.body = value;
  next();
};

// Function to validate preorder data
const validatePreorderData = (preorderData, partySize) => {
  // Check if we have orders for all people
  if (preorderData.length !== partySize) {
    return {
      valid: false,
      message: `Preorder data required for all ${partySize} people, but only ${preorderData.length} orders provided`
    };
  }

  // Check if person numbers are unique and sequential
  const personNumbers = preorderData.map(order => order.person_number).sort((a, b) => a - b);
  const expectedNumbers = Array.from({ length: partySize }, (_, i) => i + 1);
  
  if (JSON.stringify(personNumbers) !== JSON.stringify(expectedNumbers)) {
    return {
      valid: false,
      message: 'Person numbers must be sequential from 1 to party size'
    };
  }

  // Validate each preorder
  for (const order of preorderData) {
    const { error } = preorderSchema.validate(order);
    if (error) {
      return {
        valid: false,
        message: `Invalid preorder for person ${order.person_number}: ${error.details[0].message}`
      };
    }
  }

  return { valid: true };
};

// Middleware to validate date and time
const validateDateTime = (req, res, next) => {
  const { date, time } = req.body;
  
  // Check if date is in the future
  const bookingDateTime = new Date(`${date}T${time}`);
  const now = new Date();
  
  if (bookingDateTime <= now) {
    return res.status(400).json({
      error: 'Booking date and time must be in the future'
    });
  }

  // Check if date is not too far in the future (e.g., 3 months)
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  
  if (bookingDateTime > threeMonthsFromNow) {
    return res.status(400).json({
      error: 'Bookings cannot be made more than 3 months in advance'
    });
  }

  next();
};

module.exports = {
  validateBookingData,
  validatePreorderData,
  validateDateTime,
  bookingSchema,
  preorderSchema
};
