const functions = require('firebase-functions')
const express = require('express')
require('dotenv').config({ path: '../.env' }) // Load from root .env

const app = require('../app') // Use your existing app.js
const { priceCache } = require('../services/priceService')
const { query } = require('../config/db')
const cors = require('cors')
const promBundle = require('express-prom-bundle')

const metricsMiddleware = promBundle({
	includeMethod: true,
	includePath: true,
	customLabels: { project: 'crypto-signals' },
	promClient: { collectDefaultMetrics: {} }
})

app.use(metricsMiddleware)
app.use(
	cors({
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE'],
		allowedHeaders: ['Content-Type', 'Authorization']
	})
)

// Optional: pre-cache data from PostgreSQL
async function initializeCache() {
	try {
		const { rows } = await query(
			`SELECT DISTINCT ON (symbol) symbol, price, timestamp 
       FROM price_history 
       ORDER BY symbol, timestamp DESC`
		)
		rows.forEach((row) => {
			priceCache.set(row.symbol, {
				price: row.price,
				timestamp: row.timestamp
			})
		})
		console.log('✅ Price cache initialized')
	} catch (err) {
		console.error('⚠️ Cache init failed:', err)
	}
}

initializeCache() // only once at cold start

// Export Express app as Cloud Function
exports.api = functions.https.onRequest(app)
