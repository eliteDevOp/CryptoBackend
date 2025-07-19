const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../config/db')
const { sendVerificationEmail } = require('./emailService')

async function startRegistration({ username, full_name, email, password }) {
	// Check if user exists
	const existingUser = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username])
	if (existingUser.rows.length > 0) {
		throw new Error('Username or email already exists')
	}

	// Hash password and save user
	const hashedPassword = await bcrypt.hash(password, 10)
	const newUser = await query(
		`INSERT INTO users (username, email, full_name, password) 
     VALUES ($1, $2, $3, $4) RETURNING id, email`,
		[username, email, full_name, hashedPassword]
	)

	// Generate and save verification code
	const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
	await query(
		`INSERT INTO verification_codes (user_id, code, expires_at)
     VALUES ((SELECT id FROM users WHERE email = $1), $2, NOW() + INTERVAL '15 minutes')`,
		[email, verificationCode]
	)

	await sendVerificationEmail(email, verificationCode)

	return {
		success: true,
		message: 'Verification code sent to email',
		email: email // Return email instead of userId
	}
}

async function confirmVerification({ email, code }) {
	// Check valid code
	const validCode = await query(
		`SELECT * FROM verification_codes 
     WHERE user_id = (SELECT id FROM users WHERE email = $1) 
     AND code = $2 AND expires_at > NOW()`,
		[email, code]
	)
	if (validCode.rows.length === 0) {
		throw new Error('Invalid or expired code')
	}

	// Activate user
	await query('UPDATE users SET is_verified = TRUE WHERE email = $1', [email])

	// Delete used code
	await query(
		`DELETE FROM verification_codes 
     WHERE user_id = (SELECT id FROM users WHERE email = $1) AND code = $2`,
		[email, code]
	)

	return {
		success: true,
		message: 'Account verified successfully'
	}
}

async function authenticateUser({ email, password }) {
	const user = await query('SELECT * FROM users WHERE email = $1', [email])
	if (user.rows.length === 0) {
		throw new Error('Invalid credentials')
	}

	const userData = user.rows[0]

	if (!userData.is_verified) {
		throw new Error('Please verify your email first')
	}

	const isValid = await bcrypt.compare(password, userData.password)
	if (!isValid) {
		throw new Error('Invalid credentials')
	}

	const token = jwt.sign({ id: userData.id, isAdmin: userData.is_admin }, process.env.JWT_SECRET, { expiresIn: '24h' })

	return {
		id: userData.id,
		username: userData.username,
		email: userData.email,
		isAdmin: userData.is_admin,
		token
	}
}

module.exports = {
	startRegistration,
	confirmVerification,
	authenticateUser
}
