const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
	// host: 'shuttle.proxy.rlwy.net',
	// port: 36453,
	// user: 'postgres',
	// password: 'zLEANgxuxQqNRWBuXYsAaIpGreFYJIja',
	// database: 'railway',
	// ssl: { rejectUnauthorized: false }
	connectionString:'postgresql://postgres:zohaib123@localhost:5432/cryptosignals'
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