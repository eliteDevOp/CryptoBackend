const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../config/db')
const { sendVerificationEmail, verifyCode } = require('./verificationService')

async function startRegistration({ username, email, password }) {
	// Check if user already exists
	const existingUser = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username])

	if (existingUser.rows.length > 0) {
		throw new Error('Username or email already exists')
	}

	// Send verification email
	await sendVerificationEmail(email)

	// Temporarily store user details (in production, use Redis or database)
	const verificationToken = jwt.sign({ username, email, password }, p'ab546ba1aee6fd68f1ed19b7019f48dd', { expiresIn: '15m' })

	return {
		message: 'Verification email sent',
		verificationToken
	}
}

async function completeRegistration(verificationToken, code) {
	try {
		// Verify the token
		const decoded = jwt.verify(verificationToken, p'ab546ba1aee6fd68f1ed19b7019f48dd')
		const { username, email, password } = decoded

		// Verify the code
		const isVerified = await verifyCode(email, code)
		if (!isVerified) {
			throw new Error('Invalid verification code')
		}

		// Hash password and create user
		const hashedPassword = await bcrypt.hash(password, 10)
		const result = await query('INSERT INTO users (username, email, password, is_verified) VALUES ($1, $2, $3, $4) RETURNING id, username, email, is_admin', [username, email, hashedPassword, true])

		return result.rows[0]
	} catch (err) {
		if (err.name === 'JsonWebTokenError') {
			throw new Error('Invalid or expired verification token')
		}
		throw err
	}
}

async function authenticateUser({ email, password }) {
	try {
		const result = await query('SELECT id, username, email, password, is_admin, is_verified FROM users WHERE email = $1', [email])

		if (result.rows.length === 0) {
			throw new Error('Invalid credentials')
		}

		const user = result.rows[0]

		// Check if email is verified
		if (!user.is_verified) {
			throw new Error('Please verify your email first')
		}

		const isValid = await bcrypt.compare(password, user.password)
		if (!isValid) {
			throw new Error('Invalid credentials')
		}

		const token = jwt.sign({ id: user.id, isAdmin: user.is_admin }, "ab546ba1aee6fd68f1ed19b7019f48dd", { expiresIn: "24h" })

		return {
			id: user.id,
			username: user.username,
			email: user.email,
			isAdmin: user.is_admin,
			token
		}
	} catch (err) {
		throw err
	}
}

module.exports = {
	startRegistration,
	completeRegistration,
	authenticateUser
}
