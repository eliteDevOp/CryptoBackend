// scripts/initDB.js
const { query, verifyConnection } = require('../config/db')

async function initializeDatabase() {
	try {
		// Verify connection first
		const isConnected = await verifyConnection()
		if (!isConnected) {
			throw new Error('Could not establish database connection')
		}

		// Create tables in a transaction
		await query('BEGIN')

		await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(50),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)

		await query(`
      CREATE TABLE IF NOT EXISTS signals (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10) NOT NULL,
        stop_loss NUMERIC NOT NULL,
        target NUMERIC NOT NULL,
        price NUMERIC,
        entry_price NUMERIC,
        exit_price NUMERIC,
        status VARCHAR(20),
        closed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)

		await query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );
    `)

		await query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        price DECIMAL(20, 8) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_price CHECK (price > 0)
      );
    `)

		await query('COMMIT')
		console.log('✅ Database tables created successfully')
		return true
	} catch (err) {
		await query('ROLLBACK')
		console.error('❌ Error initializing database:', err.message)

		// If it's a connection error, try to reconnect
		if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
			console.log('Attempting to reconnect to database...')
			const isReconnected = await verifyConnection()
			if (isReconnected) {
				return initializeDatabase() // Retry initialization
			}
		}

		throw err
	}
}

module.exports = { initializeDatabase }
