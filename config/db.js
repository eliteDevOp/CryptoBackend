const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
	host: "localhost",
	port: 5432,
	user: "cryptosignals",
	password: "zohaib123",
	database: "cryptosignals"
})

pool.on('connect', () => {
	console.log('Connected to PostgreSQL database')
})

pool.on('error', (err) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
})

module.exports = {
	query: (text, params) => pool.query(text, params),
	pool
}