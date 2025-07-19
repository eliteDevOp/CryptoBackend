const { query } = require('../config/db')
const { startRegistration, confirmVerification, authenticateUser } = require('../services/authService')
const bcrypt = require('bcryptjs')

async function register(req, res, next) {
	const { username, full_name, password, email } = req.body
	try {
		const existingUser = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username])
		console.log(existingUser)
		if (existingUser.rows.length > 0) {
			res.status(200).json({ status: false, message: 'Username or email already exists' })
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

		res.status(200).json({
			success: true,
			message: 'Verification code sent to email',
			email: email // Return email instead of userId
		})
	} catch (err) {
		next(err)
	}
}

async function verify(req, res, next) {
	try {
		const result = await confirmVerification(req.body)
		res.json(result)
	} catch (err) {
		next(err)
	}
}

async function login(req, res, next) {
	try {
		const result = await authenticateUser(req.body)
		res.json(result)
	} catch (err) {
		next(err)
	}
}

module.exports = { register, verify, login }
