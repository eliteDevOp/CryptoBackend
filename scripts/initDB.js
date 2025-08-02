const { query } = require('../config/db')

async function initializeDatabase() {
	try {
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

		console.log('✅ Database tables created successfully')
	} catch (err) {
		console.error('❌ Error initializing database:', err)
		throw err
	}
}

module.exports = { initializeDatabase }
