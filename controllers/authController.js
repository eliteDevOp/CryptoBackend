const { startRegistration, completeRegistration, authenticateUser } = require('../services/authService')

async function startRegistrationFunc(req, res, next) {
	try {
		const { verificationToken } = await startRegistration(req.body)
		res.json({
			success: true,
			message: 'Verification email sent',
			verificationToken 
		})
	} catch (err) {
		next(err)
	}
}

async function completeRegistrationFunc(req, res, next) {
	try {
		const { verificationToken, code } = req.body
		const user = await completeRegistration(verificationToken, code)
		res.status(201).json({
			success: true,
			message: 'Account created successfully',
			user
		})
	} catch (err) {
		next(err)
	}
}

async function login(req, res, next) {
	try {
		const authData = await authenticateUser(req.body)
		res.json({
			success: true,
			...authData
		})
	} catch (err) {
		next(err)
	}
}

module.exports = {
	startRegistrationFunc,
	completeRegistrationFunc,
	login
}
