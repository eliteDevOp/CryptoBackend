// index.js
require('dotenv').config()
const app = require('./app')
const { initializeDatabase } = require('./scripts/initDB')
const { verifyConnection } = require('./config/db')

const PORT = process.env.PORT || 3000

async function startServer() {
	try {
		// Verify database connection first
		const dbReady = await verifyConnection()
		if (!dbReady) {
			throw new Error('Database connection failed')
		}

		// Initialize database
		const dbInitialized = await initializeDatabase()
		if (!dbInitialized) {
			throw new Error('Database initialization failed')
		}

		const server = app.listen(PORT, () => {
			console.log(`🚀 Server running on port ${PORT}`)
		})

		setupGracefulShutdown(server)
	} catch (err) {
		console.error('❌ Failed to start server:', err.message)
		process.exit(1)
	}
}

function setupGracefulShutdown(server) {
	const shutdown = async (signal) => {
		console.log(`${signal} received. Shutting down gracefully...`)

		try {
			await new Promise((resolve) => server.close(resolve))
			console.log('✅ Server closed')
			process.exit(0)
		} catch (err) {
			console.error('❌ Error during shutdown:', err)
			process.exit(1)
		}
	}

	process.on('SIGTERM', () => shutdown('SIGTERM'))
	process.on('SIGINT', () => shutdown('SIGINT'))
}

startServer()
