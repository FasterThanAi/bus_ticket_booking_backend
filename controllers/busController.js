const pool = require('../config/db'); // Import the database connection pool
const busController = {};

/**
 * @desc    Search for available buses
 * @route   GET /api/search
 */
busController.searchBuses = async (req, res) => {
    try {
        const { source, destination, date } = req.query;

        const sql = `
            SELECT 
                s.ScheduleID, b.BusType, b.RegNumber, r.Source, r.Destination,
                s.DepartureTime, s.ArrivalTime, s.Fare, s.AvailableSeats
            FROM Schedule s
            JOIN Route r ON s.RouteID = r.RouteID
            JOIN Bus b ON s.BusID = b.BusID
            WHERE 
                r.Source = ? AND r.Destination = ? AND DATE(s.DepartureTime) = ?
                AND s.AvailableSeats > 0;
        `;
        
        const [results] = await pool.query(sql, [source, destination, date]);
        res.json(results); // Send the list of buses back

    } catch (err) {
        console.error('Error in searchBuses:', err);
        res.status(500).json({ message: 'Server error while searching for buses' });
    }
};

/**
 * @desc    Book a ticket
 * @route   POST /api/book
 * @access  Protected
 */
busController.bookTicket = async (req, res) => {
    try {
        // --- THIS IS THE CHANGE ---
        // We now get 'numOfSeats' and a 'passengers' array from the body.
        const {
            userId,
            scheduleId,
            numOfSeats,
            passengers // This is now an array
        } = req.body;
        
        // We also get the user ID from the 'protect' middleware
        const loggedInUserId = req.user.id;

        // Security check: Make sure the user is booking for themselves
        if (loggedInUserId !== userId) {
            return res.status(403).json({ message: 'Not authorized to book for this user' });
        }
        
        // Validation: Check if the number of seats matches the passenger list
        if (passengers.length !== numOfSeats) {
            return res.status(400).json({ message: 'Number of seats does not match number of passengers.' });
        }

        // --- THIS IS THE OTHER CHANGE ---
        // We call the new procedure, passing the 'passengers' array
        // as a JSON string.
        const sql = 'CALL sp_BookTicket(?, ?, ?, ?);';

        const [results] = await pool.query(sql, [
            userId,
            scheduleId,
            numOfSeats,
            JSON.stringify(passengers) // Convert the array to a JSON string
        ]);

        // The response is the same as before
        res.json(results[0][0]);

    } catch (err) {
        console.error('Error in bookTicket:', err);
        res.status(500).json({ message: 'Server error while booking ticket' });
    }
};

/**
 * @desc    Get all bookings for a specific user
 * @route   GET /api/bookings/:userId
 */
busController.getMyBookings = async (req, res) => {
    try {
        const { userId } = req.params; // Get userId from the URL (e.g., /api/bookings/1)

        const sql = `
            SELECT 
                b.BookingID, r.Source, r.Destination, s.DepartureTime,
                b.NumOfSeats, b.TotalAmount, b.Status, b.BookingDate
            FROM Booking b
            JOIN Schedule s ON b.ScheduleID = s.ScheduleID
            JOIN Route r ON s.RouteID = r.RouteID
            WHERE 
                b.UserID = ?
            ORDER BY 
                s.DepartureTime DESC;
        `;
        
        const [results] = await pool.query(sql, [userId]);
        res.json(results); // Send the list of bookings back

    } catch (err) {
        console.error('Error in getMyBookings:', err);
        res.status(500).json({ message: 'Server error while fetching bookings' });
    }
};

/**
 * @desc    Cancel a ticket
 * @route   POST /api/cancel
 */
busController.cancelTicket = async (req, res) => {
    try {
        const { bookingId } = req.body; // Get bookingId from the request body

        const sql = 'CALL sp_CancelTicket(?);';
        
        const [results] = await pool.query(sql, [bookingId]);

        res.json(results[0][0]); // Send the { Message: '...' } back

    } catch (err) {
        console.error('Error in cancelTicket:', err);
        res.status(500).json({ message: 'Server error while cancelling ticket' });
    }
};
/**
 * @desc    Get full details for a single booking
 * @route   GET /api/booking/:bookingId
 * @access  Protected
 */
busController.getBookingDetails = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id; // From 'protect' middleware

        // 1. Get the main booking details
        const bookingSql = `
            SELECT 
                b.BookingID, b.NumOfSeats, b.TotalAmount, b.Status, b.BookingDate,
                s.DepartureTime, s.ArrivalTime, s.Fare,
                r.Source, r.Destination,
                bu.RegNumber, bu.BusType
            FROM Booking b
            JOIN Schedule s ON b.ScheduleID = s.ScheduleID
            JOIN Route r ON s.RouteID = r.RouteID
            JOIN Bus bu ON s.BusID = bu.BusID
            WHERE b.BookingID = ? AND b.UserID = ?;
        `;
        
        const [bookingResult] = await pool.query(bookingSql, [bookingId, userId]);

        if (bookingResult.length === 0) {
            return res.status(404).json({ message: 'Booking not found or user not authorized.' });
        }

        // 2. Get the passenger details for this booking
        const passengerSql = `
            SELECT Name, Age, Gender, SeatNumber 
            FROM Passenger 
            WHERE BookingID = ?;
        `;
        const [passengers] = await pool.query(passengerSql, [bookingId]);

        // 3. Combine and send the response
        res.json({
            details: bookingResult[0],
            passengers: passengers
        });

    } catch (err) {
        console.error('Error in getBookingDetails:', err);
        res.status(500).json({ message: 'Server error fetching booking details' });
    }
};

module.exports = busController;