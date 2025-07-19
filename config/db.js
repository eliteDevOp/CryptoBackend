const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
	connectionString: "postgresql://postgres:zLEANgxuxQqNRWBuXYsAaIpGreFYJIja@shuttle.proxy.rlwy.net:36453/railway",
	ssl: { rejectUnauthorized: false } // may be needed for some hosts
})

pool.on('connect', () => {
	console.log('Connected to PostgreSQL database')
})

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