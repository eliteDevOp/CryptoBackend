const nodemailer = require('nodemailer')

// Configure your email provider here
const transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: 'signalscrypto301@gmail.com',
		pass: 'uahr xvvn paua kktu'
	}
})

async function sendVerificationEmail(email, code) {
	const mailOptions = {
		from: 'signalscrypto301@gmail.com',
		to: email,
		subject: 'Verify Your Account',
		html: `Your verification code is: <b>${code}</b> (expires in 15 minutes)`
	}

	await transporter.sendMail(mailOptions)
}

module.exports = { sendVerificationEmail }
