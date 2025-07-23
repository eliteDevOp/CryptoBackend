const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../config/db')
const { sendVerificationEmail } = require('./emailService')

async function startRegistration({ username, full_name, email, password }) {
	// Check if user exists
	
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
		res.json({message:'Invalid or expired code'})
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
		res.json({message:'Invalid credentials'})
	}

	const userData = user.rows[0]

	if (!userData.is_verified) {
		res.json({message:'Please verify your email first'})
	}

	const isValid = await bcrypt.compare(password, userData.password)
	if (!isValid) {
		res.json({message:'Invalid credentials'})
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
