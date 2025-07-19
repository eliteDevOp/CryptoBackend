const { query } = require('../config/db')
const { startRegistration, confirmVerification, authenticateUser } = require('../services/authService')
const { sendVerificationEmail, verifyCode } = require('../services/verificationService')
const bcrypt = require('bcryptjs')

// In authController.js
async function register(req, res, next) {
    console.log('Register endpoint hit');
    const { username, full_name, password, email } = req.body
    try {
        console.log('Checking existing user...');
        const existingUser = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username])
        
        if (existingUser.rows.length > 0) {
            console.log('User exists, returning response');
            return res.status(200).json({ status: false, message: 'Username or email already exists' })
        }

        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10)
        
        console.log('Creating new user...');
        const newUser = await query(
            `INSERT INTO users (username, email, full_name, password) 
             VALUES ($1, $2, $3, $4) RETURNING id, email`,
            [username, email, full_name, hashedPassword]
        )
        
        console.log('User created, generating verification code...');
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
        
        console.log('Saving verification code...');
        await query(
            `INSERT INTO verification_codes (user_id, code, expires_at)
             VALUES ((SELECT id FROM users WHERE email = $1), $2, NOW() + INTERVAL '15 minutes')`,
            [email, verificationCode]
        )
        
        console.log('Sending verification email...');
        await sendVerificationEmail(email, verificationCode)
        
        console.log('Registration complete, sending response');
        res.status(200).json({
            success: true,
            message: 'Verification code sent to email',
            email: email
        })
    } catch (err) {
        console.error('Error in registration:', err);
        next(err)
    }
}

async function verify(req, res, next) {
	try {
		const { email, code } = req.body
		const isValid = await verifyCode(email, code)

		if (!isValid) {
			return res.status(400).json({ success: false, message: 'Invalid or expired code' })
		}

		await query('UPDATE users SET is_verified = TRUE WHERE email = $1', [email])
		res.json({ success: true, message: 'Account verified successfully' })
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
