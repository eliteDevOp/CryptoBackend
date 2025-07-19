const { query } = require('../config/db')
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
// verificationService.js

// In verificationService.js
async function sendVerificationEmail(email, code) {
    const mailOptions = {
        from: process.env.EMAIL_FROM || "signalscrypto301@gmail.com",
        to: email,
        subject: "Verify your email address",
        text: `Your verification code is: ${code}`,
        html: `<p>Your verification code is: <strong>${code}</strong></p>`
    }

    // Add timeout
    const emailTimeout = 10000 // 10 seconds
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Email sending timed out after ${emailTimeout}ms`)), emailTimeout)
    })

    try {
        console.log('Attempting to send email...')
        await Promise.race([
            transporter.sendMail(mailOptions),
            timeoutPromise
        ])
        console.log('Email sent successfully')
    } catch (err) {
        console.error('Email sending failed:', err)
        throw err
    }
}

async function verifyCode(email, code) {
    const result = await query(
        `SELECT * FROM verification_codes 
         WHERE user_id = (SELECT id FROM users WHERE email = $1) 
         AND code = $2 AND expires_at > NOW()`,
        [email, code]
    )
    
    if (result.rows.length > 0) {
        await query(
            `DELETE FROM verification_codes 
             WHERE user_id = (SELECT id FROM users WHERE email = $1) AND code = $2`,
            [email, code]
        )
        return true
    }
    return false
}

module.exports = {
	sendVerificationEmail,
	verifyCode
}
