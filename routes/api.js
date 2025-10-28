const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');

// Import our new bouncer
const { protect, isAdmin } = require('../middleware/authMiddleware'); 

// --- Public Routes (Anyone can access) ---

// @route   GET /api/search
// @desc    Search for buses
router.get('/search', busController.searchBuses);


// --- Private Routes (Only logged-in users can access) ---
// We add `protect` as the second argument.
// It runs *before* the busController function.

// @route   POST /api/book
// @desc    Book a new ticket (Protected)
router.post('/book', protect, busController.bookTicket);

// @route   GET /api/bookings/:userId
// @desc    Get all bookings for a specific user (Protected)
router.get('/bookings/:userId', protect, busController.getMyBookings);

// @route   POST /api/cancel
// @desc    Cancel a ticket (Protected)
router.post('/cancel', protect, busController.cancelTicket);

module.exports = router;