const pool = require('../config/db');
const adminController = {};

/**
 * @desc    Add a new Bus
 * @route   POST /api/admin/bus
 * @access  Private (Admin)
 */
adminController.addBus = async (req, res) => {
    try {
        const { regNumber, capacity, busType } = req.body;
        
        if (!regNumber || !capacity || !busType) {
            return res.status(400).json({ message: 'Please provide all bus details' });
        }

        const sql = 'INSERT INTO Bus (RegNumber, Capacity, BusType) VALUES (?, ?, ?)';
        const [result] = await pool.query(sql, [regNumber, capacity, busType]);
        
        res.status(201).json({ message: 'Bus added successfully', busId: result.insertId });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error adding bus' });
    }
};

/**
 * @desc    Add a new Route
 * @route   POST /api/admin/route
 * @access  Private (Admin)
 */
adminController.addRoute = async (req, res) => {
    try {
        const { source, destination } = req.body;
        
        if (!source || !destination) {
            return res.status(400).json({ message: 'Please provide source and destination' });
        }

        const sql = 'INSERT INTO Route (Source, Destination) VALUES (?, ?)';
        const [result] = await pool.query(sql, [source, destination]);
        
        res.status(201).json({ message: 'Route added successfully', routeId: result.insertId });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error adding route' });
    }
};

/**
 * @desc    Add a new Schedule
 * @route   POST /api/admin/schedule
 * @access  Private (Admin)
 */
adminController.addSchedule = async (req, res) => {
    try {
        const { busId, routeId, departureTime, arrivalTime, fare, availableSeats } = req.body;

        // Simple validation
        if (!busId || !routeId || !departureTime || !arrivalTime || !fare || !availableSeats) {
            return res.status(400).json({ message: 'Please provide all schedule details' });
        }

        const sql = `
            INSERT INTO Schedule (BusID, RouteID, DepartureTime, ArrivalTime, Fare, AvailableSeats) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(sql, [busId, routeId, departureTime, arrivalTime, fare, availableSeats]);
        
        res.status(201).json({ message: 'Schedule added successfully', scheduleId: result.insertId });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error adding schedule' });
    }
};
// --- READ (GET) Functions ---

/**
 * @desc    Get all buses
 * @route   GET /api/admin/bus
 * @access  Private (Admin)
 */
adminController.getAllBuses = async (req, res) => {
    try {
        const [buses] = await pool.query('SELECT * FROM Bus ORDER BY BusID DESC');
        res.json(buses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching buses' });
    }
};

/**
 * @desc    Get all schedules
 * @route   GET /api/admin/schedule
 * @access  Private (Admin)
 */
adminController.getAllSchedules = async (req, res) => {
    try {
        const sql = `
            SELECT s.*, b.RegNumber, r.Source, r.Destination
            FROM Schedule s
            JOIN Bus b ON s.BusID = b.BusID
            JOIN Route r ON s.RouteID = r.RouteID
            ORDER BY s.DepartureTime DESC
        `;
        const [schedules] = await pool.query(sql);
        res.json(schedules);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching schedules' });
    }
};

// --- UPDATE (PUT) Functions ---

/**
 * @desc    Update a schedule
 * @route   PUT /api/admin/schedule/:id
 * @access  Private (Admin)
 */
adminController.updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { fare, departureTime, arrivalTime, availableSeats } = req.body;

        // Validation
        if (!fare || !departureTime || !arrivalTime || !availableSeats) {
            return res.status(400).json({ message: 'All fields are required to update' });
        }
        
        // Convert JS T-Z format to SQL-friendly format
        const sqlDepartureTime = departureTime.replace('T', ' ');
        const sqlArrivalTime = arrivalTime.replace('T', ' ');

        const sql = `
            UPDATE Schedule 
            SET Fare = ?, DepartureTime = ?, ArrivalTime = ?, AvailableSeats = ? 
            WHERE ScheduleID = ?
        `;
        
        await pool.query(sql, [fare, sqlDepartureTime, sqlArrivalTime, availableSeats, id]);
        
        res.json({ message: 'Schedule updated successfully' });

    } catch (err) {
        console.error('Error updating schedule:', err);
        res.status(500).json({ message: 'Server error updating schedule' });
    }
};

// --- DELETE (DELETE) Functions ---

/**
 * @desc    Delete a schedule
 * @route   DELETE /api/admin/schedule/:id
 * @access  Private (Admin)
 */

adminController.deleteSchedule = async (req, res) => {
    let connection; // We need a connection for transactions
    try {
        const { id } = req.params; // Get ScheduleID from URL

        // Get a connection from the pool
        connection = await pool.getConnection();
        
        // Start a transaction
        await connection.beginTransaction();

        // 1. Delete all bookings (Confirmed and Cancelled) for this schedule.
        //    This will also trigger the ON DELETE CASCADE for passengers.
        await connection.query('DELETE FROM Booking WHERE ScheduleID = ?', [id]);

        // 2. Now that no bookings reference this schedule, it's safe to delete.
        const [result] = await connection.query('DELETE FROM Schedule WHERE ScheduleID = ?', [id]);

        // 3. If we get here, both deletes worked. Commit the changes.
        await connection.commit();
        connection.release(); // Release the connection back to the pool

        // Check if we actually deleted anything
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Schedule not found with that ID' });
        }

        res.json({ message: 'Schedule and all associated bookings deleted successfully' });

    } catch (err) {
        // If anything went wrong, roll back all changes
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error in deleteSchedule:', err);
        res.status(500).json({ message: 'Server error deleting schedule' });
    }
};
/**
 * @desc    Delete a Bus
 * @route   DELETE /api/admin/bus/:id
 * @access  Private (Admin)
 */
adminController.deleteBus = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Find all schedules using this bus
        const [schedules] = await connection.query('SELECT ScheduleID FROM Schedule WHERE BusID = ?', [id]);
        
        // For each schedule, delete its bookings
        for (const schedule of schedules) {
            await connection.query('DELETE FROM Booking WHERE ScheduleID = ?', [schedule.ScheduleID]);
        }
        
        // Now delete all schedules using this bus
        await connection.query('DELETE FROM Schedule WHERE BusID = ?', [id]);
        
        // Finally, delete the bus itself
        const [result] = await connection.query('DELETE FROM Bus WHERE BusID = ?', [id]);
        
        await connection.commit();
        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Bus not found' });
        }
        res.json({ message: 'Bus and all related schedules/bookings deleted' });

    } catch (err) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error deleting bus:', err);
        res.status(500).json({ message: 'Server error deleting bus. Check for dependencies.' });
    }
};

/**
 * @desc    Delete a Route
 * @route   DELETE /api/admin/route/:id
 * @access  Private (Admin)
 */
adminController.deleteRoute = async (req, res) => {
    // This is similar to deleting a bus. We must cascade delete.
    let connection;
    try {
        const { id } = req.params;
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [schedules] = await connection.query('SELECT ScheduleID FROM Schedule WHERE RouteID = ?', [id]);
        for (const schedule of schedules) {
            await connection.query('DELETE FROM Booking WHERE ScheduleID = ?', [schedule.ScheduleID]);
        }
        await connection.query('DELETE FROM Schedule WHERE RouteID = ?', [id]);
        const [result] = await connection.query('DELETE FROM Route WHERE RouteID = ?', [id]);
        
        await connection.commit();
        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Route not found' });
        }
        res.json({ message: 'Route and all related schedules/bookings deleted' });

    } catch (err) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error deleting route:', err);
        res.status(500).json({ message: 'Server error deleting route.' });
    }
};
/**
 * @desc    Get all routes
 * @route   GET /api/admin/route
 * @access  Private (Admin)
 */
adminController.getAllRoutes = async (req, res) => {
    try {
        const [routes] = await pool.query('SELECT * FROM Route ORDER BY RouteID DESC');
        res.json(routes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching routes' });
    }
};
module.exports = adminController;