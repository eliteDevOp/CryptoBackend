const { Pool } = require('pg')
require('dotenv').config()

const poolConfig = {
	user: 'postgres',
	host: '38.180.244.204',
	database: 'cryptosignals',
	password: 'zohaib123',
	port: 3000,
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000, // Increased timeout for remote connections
	ssl: false
}

const pool = new Pool(poolConfig)

// Enhanced connection verification with remote-specific checks
async function verifyConnection() {
	let client
	try {
		console.log(`Attempting to connect to PostgreSQL at ${poolConfig.host}:${poolConfig.port}`)
		client = await pool.connect()
		const res = await client.query('SELECT 1')
		console.log('✅ Successfully connected to remote PostgreSQL')
		return true
	} catch (err) {
		console.error('❌ Remote PostgreSQL connection failed:', {
			error: err.message,
			host: poolConfig.host,
			port: poolConfig.port,
			database: poolConfig.database,
			user: poolConfig.user
		})

		// Provide specific troubleshooting tips for remote connections
		if (err.code === 'ECONNREFUSED') {
			console.log('Troubleshooting tips:')
			console.log('1. Verify the VPS IP and port are correct')
			console.log('2. Check if PostgreSQL is running on the VPS')
			console.log('3. Ensure the VPS firewall allows connections on port 3000')
			console.log('4. Confirm pg_hba.conf allows remote connections')
		}

		return false
	} finally {
		if (client) client.release()
	}
}

// Retry connection with incremental backoff
async function connectWithRetry(retries = 5, initialDelay = 1000) {
	for (let i = 0; i < retries; i++) {
		if (await verifyConnection()) return true

		if (i < retries - 1) {
			const delay = initialDelay * Math.pow(2, i)
			console.log(`Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`)
			await new Promise((resolve) => setTimeout(resolve, delay))
		}
	}
	return false
}

module.exports = {
	query: async (text, params) => {
		try {
			const res = await pool.query(text, params)
			return res
		} catch (err) {
			console.error('Query error:', {
				query: text.substring(0, 100),
				error: err.message
			})
			throw err
		}
	},
	pool,
	verifyConnection,
	connectWithRetry
}
