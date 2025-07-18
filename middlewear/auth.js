const jwt = require('jsonwebtoken')
const { query } = require('../config/db')

async function auth(req, res, next) {
	try {
		const token = req.header('Authorization')?.replace('Bearer ', '')

		if (!token) {
			return res.status(401).json({ error: 'Authentication required' })
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET)

		const result = await query('SELECT id, username, email, is_admin FROM users WHERE id = $1', [decoded.id])

		if (result.rows.length === 0) {
			return res.status(401).json({ error: 'User not found' })
		}

		req.user = result.rows[0]
		next()
	} catch (err) {
		res.status(401).json({ error: 'Invalid token' })
	}
}

function adminAuth(req, res, next) {
	if (!req.user?.is_admin) {
		return res.status(403).json({ error: 'Admin access required' })
	}
	next()
}

module.exports = {
	auth,
	adminAuth
}
