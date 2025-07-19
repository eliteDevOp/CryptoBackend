const nodemailer = require('nodemailer')
const crypto = require('crypto')

const verificationCodes = new Map()

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: "signalscrypto301@gmail.com",
		pass: "uahr xvvn paua kktu"
	}
})

async function sendVerificationEmail(email) {
	const code = crypto.randomInt(100000, 999999).toString()
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

	verificationCodes.set(email, { code, expiresAt })

	const mailOptions = {
		from: "signalscrypto301@gmail.com",
		to: email,
		subject: "Verify your email address",
		text: `Your verification code is: ${code}`,
		html: `<p>Your verification code is: <strong>${code}</strong></p>`
	}

	await transporter.sendMail(mailOptions)
}

async function verifyCode(email, code) {
	const record = verificationCodes.get(email)
	if (!record) return false

	// Check if code matches and isn't expired
	if (record.code === code && new Date() < record.expiresAt) {
		verificationCodes.delete(email)
		return true
	}

	return false
}

module.exports = {
	sendVerificationEmail,
	verifyCode
}
