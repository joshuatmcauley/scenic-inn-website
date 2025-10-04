const express = require('express');
const router = express.Router();

// Placeholder customer routes
router.get('/', (req, res) => {
  res.json({ message: 'Customer routes placeholder' });
});

module.exports = router;
