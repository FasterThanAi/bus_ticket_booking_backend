const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Loads .env file
const apiRoutes = require('./routes/api'); // Import your API routes
// const apiRoutes = require('./routes/api'); // Your original routes
const authRoutes = require('./routes/auth'); // Your new auth routes
const adminRoutes = require('./routes/admin');
// Initialize the Express app
const app = express();

const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:3000']// Only allow requests from your Vite/React app
};

// --- Middlewares ---
// These are functions that run on every request
app.use(cors(corsOptions)); // Allows your frontend to make requests
app.use(express.json()); // Allows the server to read JSON from request bodies

// --- API Routes ---
// Tell the app to use your route file for any URL starting with /api
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// --- Simple "Health Check" route ---
// You can visit this in your browser to see if the server is running
app.get('/', (req, res) => {
    res.send('Bus Ticket Booking API is running! 🚀');
});

// --- Start the Server ---
const PORT = process.env.PORT || 8080; // Use port 8080 by default

app.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});