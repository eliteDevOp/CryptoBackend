require('dotenv').config()
const app = require('./app')
const { priceCache } = require('./services/priceService')
const { pool } = require('./config/db')

const PORT = 8080

const server = app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})

async function initializeCache() {
	const { rows } = await pool.query(
		`SELECT DISTINCT ON (symbol) symbol, price, timestamp 
     FROM price_history 
     ORDER BY symbol, timestamp DESC`
	)
	rows.forEach((row) =>
		priceCache.set(row.symbol, {
			price: row.price,
			timestamp: row.timestamp
		})
	)
}

process.on('SIGTERM', () => {
	console.log('SIGTERM received. Shutting down gracefully')
	server.close(() => {
		pool.end(() => {
			console.log('Database connection closed')
			process.exit(0)
		})
	})
})

process.on('SIGINT', () => {
	console.log('SIGINT received. Shutting down gracefully')
	server.close(() => {
		pool.end(() => {
			console.log('Database connection closed')
			process.exit(0)
		})
	})
})
