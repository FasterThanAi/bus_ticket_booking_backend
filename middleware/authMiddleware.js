const jwt = require('jsonwebtoken');
require('dotenv').config();

// This is our "bouncer" function
const protect = (req, res, next) => {
    let token;

    // The token is usually sent in the 'Authorization' header
    // It looks like: "Bearer [ey...token...string]"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Get token from header (splitting "Bearer" from the token)
            token = req.headers.authorization.split(' ')[1];

            // 2. Verify the token is real using our secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Attach the user's info (from the token) to the request object
            // Now, any *protected* route can access req.user to see who is logged in
            req.user = decoded.user;

            // 4. Let them pass to the next function (the actual controller)
            next();

        } catch (err) {
            console.error(err);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// We can add another middleware to check if the user is an Admin
const isAdmin = (req, res, next) => {
    // This runs *after* the 'protect' middleware, so we already have req.user
    if (req.user && req.user.userType === 'Admin') {
        next(); // They are an admin, let them pass
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' }); // "403 Forbidden"
    }
};

module.exports = { protect, isAdmin };