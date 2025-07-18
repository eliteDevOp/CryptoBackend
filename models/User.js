const { query } = require('../config/db')

class User {
	static async findByEmail(email) {
		const result = await query('SELECT * FROM users WHERE email = $1', [email])
		return result.rows[0]
	}

	static async findById(id) {
		const result = await query('SELECT id, username, email, is_admin FROM users WHERE id = $1', [id])
		return result.rows[0]
	}

	static async create({ username, email, password, isAdmin }) {
		const result = await query('INSERT INTO users (username, email, password, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, email, is_admin', [username, email, password, isAdmin])
		return result.rows[0]
	}
}

module.exports = User
