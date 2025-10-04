const express = require('express');
const router = express.Router();

// Placeholder campaign routes
router.get('/', (req, res) => {
  res.json({ message: 'Campaign routes placeholder' });
});

module.exports = router;
