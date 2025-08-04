require('dotenv').config()
const app = require('./app')
const { priceCache } = require('./services/priceService')
const { query } = require('./config/db')
const cors = require('cors')

const PORT = 3000

const promBundle = require('express-prom-bundle')
const { initializeDatabase } = require('./scripts/initDB')
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

async function startServer() {
	try {
		const server = app.listen(PORT, () => {
			console.log(`🚀 Server running on port ${PORT}`)
		})

		setupGracefulShutdown(server)
	} catch (err) {
		console.error('❌ Failed to start server:', err)
		process.exit(1)
	}
}

function setupGracefulShutdown(server) {
	const shutdown = async (signal) => {
		console.log(`${signal} received. Shutting down gracefully...`)

		try {
			// Close server first to stop new connections
			await new Promise((resolve) => server.close(resolve))

			console.log('✅ Server and database connections closed')
			process.exit(0)
		} catch (err) {
			console.error('❌ Error during shutdown:', err)
			process.exit(1)
		}
	}

	process.on('SIGTERM', () => shutdown('SIGTERM'))
	process.on('SIGINT', () => shutdown('SIGINT'))
}

// Start the application
startServer()
