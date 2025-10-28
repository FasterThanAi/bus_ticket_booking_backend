const mysql = require('mysql2/promise');
require('dotenv').config(); // Loads the .env file variables

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// A simple function to test the connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('🎉 Successfully connected to the database!');
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
}

testConnection();

// Export the pool so other files can use it
module.exports = pool;