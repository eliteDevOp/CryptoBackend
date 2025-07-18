const request = require('supertest')
const app = require('../app')
const { query } = require('../config/db')
const User = require('../models/User')

describe('Authentication API', () => {
	const testUser = {
		username: 'testuser',
		email: 'test@example.com',
		password: 'testpassword'
	}

	beforeAll(async () => {
		// Create a test user
		await User.create(testUser)
	})

	describe('POST /auth/register', () => {
		it('should register a new user', async () => {
			const response = await request(app).post('/auth/register').send({
				username: 'newuser',
				email: 'new@example.com',
				password: 'newpassword'
			})

			expect(response.statusCode).toBe(201)
			expect(response.body).toHaveProperty('id')
			expect(response.body.email).toBe('new@example.com')
		})

		it('should reject duplicate email', async () => {
			const response = await request(app).post('/auth/register').send(testUser)

			expect(response.statusCode).toBe(400)
		})
	})

	describe('POST /auth/login', () => {
		it('should authenticate with valid credentials', async () => {
			const response = await request(app).post('/auth/login').send({
				email: testUser.email,
				password: testUser.password
			})

			expect(response.statusCode).toBe(200)
			expect(response.body).toHaveProperty('token')
		})

		it('should reject invalid credentials', async () => {
			const response = await request(app).post('/auth/login').send({
				email: testUser.email,
				password: 'wrongpassword'
			})

			expect(response.statusCode).toBe(401)
		})
	})
})
