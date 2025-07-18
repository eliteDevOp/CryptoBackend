const { query } = require('../config/db')
const { pool } = require('../config/db')

beforeAll(async () => {
	await query('BEGIN')
})

afterEach(async () => {
	await query('ROLLBACK')
})

afterAll(async () => {
	await pool.end()
})
