const request = require('supertest')
const app = require('../app')
const { query } = require('../config/db')
const Price = require('../models/Price')
const { auth } = require('../middlewear/auth')

describe('Price API', () => {
	const testPrice = {
		symbol: 'BTCUSD',
		price: '50000.00',
		timestamp: new Date().toISOString()
	}

	let authToken

	beforeAll(async () => {
		// Create test user and get auth token
		const registerResponse = await request(app).post('/auth/register').send({
			username: 'priceuser',
			email: 'price@example.com',
			password: 'pricepassword'
		})

		const loginResponse = await request(app).post('/auth/login').send({
			email: 'price@example.com',
			password: 'pricepassword'
		})

		authToken = loginResponse.body.token

		// Insert test price data
		await Price.create(testPrice)
	})

	describe('GET /api/price/:symbol', () => {
		it('should get current price for a symbol', async () => {
			const response = await request(app).get('/api/price/BTCUSD').set('Authorization', `Bearer ${authToken}`)

			expect(response.statusCode).toBe(200)
			expect(response.body).toHaveProperty('symbol', 'BTCUSD')
			expect(response.body).toHaveProperty('price')
		})

		it('should return 404 for unknown symbol', async () => {
			const response = await request(app).get('/api/price/UNKNOWN').set('Authorization', `Bearer ${authToken}`)

			expect(response.statusCode).toBe(404)
		})
	})

	describe('GET /api/price-history/:symbol', () => {
		it('should get price history for a symbol', async () => {
			const response = await request(app).get('/api/price-history/BTCUSD').set('Authorization', `Bearer ${authToken}`)

			expect(response.statusCode).toBe(200)
			expect(Array.isArray(response.body)).toBe(true)
			expect(response.body.length).toBeGreaterThan(0)
		})
	})
})
