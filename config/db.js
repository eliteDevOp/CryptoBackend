const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: 'postgresql://postgres:zohaib123@localhost:5432/cryptosignals'
})


// Modify the pool.on('connect') to call this once
let firstConnect = false;

pool.on('connect', async () => {
  if (!firstConnect) {
    console.log('Connected to PostgreSQL database');
    firstConnect = true;
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