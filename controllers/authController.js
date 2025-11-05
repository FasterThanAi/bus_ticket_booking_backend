const pool = require('../config/db');
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For creating tokens
require('dotenv').config(); // To get our JWT_SECRET from .env

const authController = {};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 */
authController.registerUser = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // 1. Check if user already exists
        const [userExists] = await pool.query('SELECT * FROM Users WHERE Email = ?', [email]);
        
        if (userExists.length > 0) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // 2. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Insert new user into database
        // We'll register everyone as 'Customer' by default
        const sql = 'INSERT INTO Users (Name, Email, Password, Phone, UserType) VALUES (?, ?, ?, ?, ?)';
        await pool.query(sql, [name, email, hashedPassword, phone, 'Customer']);

        res.status(201).json({ message: 'User registered successfully!' });

    } catch (err) {
        console.error('Error in registerUser:', err);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

/**
 * @desc    Authenticate (login) a user
 * @route   POST /api/auth/login
 */
authController.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find the user by email
        const [users] = await pool.query('SELECT * FROM Users WHERE Email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' }); // "401 Unauthorized"
        }

        const user = users[0];

        // 2. Compare the provided password with the hashed password in the DB
        const isMatch = await bcrypt.compare(password, user.Password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 3. User is valid! Create a JSON Web Token (JWT)
        const payload = {
            user: {
                id: user.UserID,
                name: user.Name,
                email: user.Email,
                userType: user.UserType,
                phone: user.Phone // <-- ADD THIS LINE
            }
        };

        // Sign the token with a secret key
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }, // Token lasts for 7 days
            (err, token) => {
                if (err) throw err;
                // 4. Send the token back to the user
                res.json({
                    message: 'Login successful!',
                    token: token,
                    user: payload.user // Send user info (without password)
                });
            }
        );

    } catch (err) {
        console.error('Error in loginUser:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

module.exports = authController;