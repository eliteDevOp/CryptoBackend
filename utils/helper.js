const crypto = require('crypto')

function generateRandomString(length = 32) {
	return crypto
		.randomBytes(Math.ceil(length / 2))
		.toString('hex')
		.slice(0, length)
}

function validateEmail(email) {
	const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	return re.test(String(email).toLowerCase())
}

function formatPriceData(prices) {
	return prices.map((price) => ({
		symbol: price.symbol,
		price: parseFloat(price.price),
		timestamp: price.timestamp
	}))
}

module.exports = {
	generateRandomString,
	validateEmail,
	formatPriceData
}
