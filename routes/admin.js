const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
// --- CREATE (POST) Routes ---
router.post('/bus', protect, isAdmin, adminController.addBus);
router.post('/route', protect, isAdmin, adminController.addRoute);
router.post('/schedule', protect, isAdmin, adminController.addSchedule);

// --- READ (GET) Routes ---
router.get('/bus', protect, isAdmin, adminController.getAllBuses);
router.get('/schedule', protect, isAdmin, adminController.getAllSchedules);
router.get('/route', protect, isAdmin, adminController.getAllRoutes); // <-- ADD THIS LINE

// --- UPDATE (PUT) Route ---
// :id is a URL parameter
router.put('/schedule/:id', protect, isAdmin, adminController.updateSchedule);

// --- DELETE (DELETE) Route ---
router.delete('/schedule/:id', protect, isAdmin, adminController.deleteSchedule);
router.delete('/bus/:id', protect, isAdmin, adminController.deleteBus); // <-- ADD THIS
router.delete('/route/:id', protect, isAdmin, adminController.deleteRoute); // <-- ADD THIS
// --- Admin Routes ---
// Notice how we apply both 'protect' and 'isAdmin' middleware.
// A user must be logged in AND be an admin to access these.

// @route   POST /api/admin/bus
// @desc    Add a new bus
router.post('/bus', protect, isAdmin, adminController.addBus);

// @route   POST /api/admin/route
// @desc    Add a new route
router.post('/route', protect, isAdmin, adminController.addRoute);

// @route   POST /api/admin/schedule
// @desc    Add a new schedule
router.post('/schedule', protect, isAdmin, adminController.addSchedule);


module.exports = router;

