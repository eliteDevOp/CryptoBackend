const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: 'postgresql://postgres:zohaib123@localhost:5432/cryptosignals'
})

// Add this to your db.js file
async function initializeDatabaseIndexes() {
  try {
    console.log('Checking/creating database indexes...');
    
    const createIndexQueries = [
      `CREATE INDEX IF NOT EXISTS idx_price_history_symbol_timestamp ON price_history(symbol, timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_price_history_symbol_created ON price_history(symbol, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol)`,
      `CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status) WHERE status IS NOT NULL`
    ];

    for (const query of createIndexQueries) {
      await pool.query(query);
    }

    console.log('Database indexes verified/created successfully');
  } catch (err) {
    console.error('Error creating database indexes:', err);
    // Don't throw error - server can run without indexes (just slower)
  }
}

// Modify the pool.on('connect') to call this once
let firstConnect = false;

pool.on('connect', async () => {
  if (!firstConnect) {
    console.log('Connected to PostgreSQL database');
    firstConnect = true;
    await initializeDatabaseIndexes(); // Add this line
  }
});

pool.on('error', (err) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
})

module.exports = {
	async query(text, params) {
		try {
			const res = await pool.query(text, params)
			return res
		} catch (err) {
			console.error("Error executing query", err)
			throw err
		}
	},
	pool
}