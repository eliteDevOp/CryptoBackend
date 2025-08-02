const WebSocket = require('ws')
const { query } = require('../config/db')
const { storePrice } = require('../services/priceService')

class PolygonWebSocket {
	constructor() {
		this.activeSubscriptions = new Set()
		this.priceCache = new Map()
		this.reconnectInterval = 5000
		this.connected = false
	}

	connect() {
		this.socket = new WebSocket('wss://socket.polygon.io/crypto')

		this.socket.on('open', () => {
			console.log('Connected to Polygon.io WebSocket')
			this.authenticate()
			this.connected = true
		})

		this.socket.on('message', (data) => {
			try {
				const message = JSON.parse(data)
				this.handleMessage(message)
			} catch (err) {
				console.error('Error parsing WebSocket message:', err)
			}
		})

		this.socket.on('close', () => {
			this.connected = false
			console.log('Disconnected from Polygon.io - attempting reconnect')
			setTimeout(() => this.connect(), this.reconnectInterval)
		})

		this.socket.on('error', (err) => {
			console.error('WebSocket error:', err)
		})
	}

	authenticate() {
		this.socket.send(
			JSON.stringify({
				action: 'auth',
				params: '78hO5g90HYMrUwS0sntujCmD3hH9YzNp'
			})
		)

		// Subscribe to all crypto pairs
		this.socket.send(
			JSON.stringify({
				action: 'subscribe',
				params: 'XT.*'
			})
		)
	}

	async handleMessage(message) {
		try {
			if (Array.isArray(message)) {
				message.forEach((event) => {
					if (event.ev === 'XT') {
						// Crypto Trade event
						const priceData = {
							symbol: event.pair,
							price: event.p,
							timestamp: new Date(event.t)
						}

						// Store in memory cache
						this.priceCache.set(priceData.symbol, {
							price: priceData.price,
							timestamp: priceData.timestamp,
							lastUpdated: Date.now()
						})

						// Store in database (optional)
						storePrice(priceData)
					}
				})
			} else if (message.ev === 'XT') {
				// Handle single message
				const priceData = {
					symbol: message.pair,
					price: message.p,
					timestamp: new Date(message.t)
				}

				// Store in memory cache
				this.priceCache.set(priceData.symbol, {
					price: priceData.price,
					timestamp: priceData.timestamp,
					lastUpdated: Date.now()
				})

				// Store in database (optional)
				storePrice(priceData)
			}
		} catch (err) {
			console.error('Error handling WebSocket message:', err)
		}
	}

	getPrice(symbol) {
		const data = this.priceCache.get(symbol)
		if (!data) return null

		return {
			price: data.price,
			timestamp: data.timestamp,
			lastUpdated: new Date(data.lastUpdated)
		}
	}

	getAllPrices() {
		const prices = {}
		this.priceCache.forEach((value, key) => {
			prices[key] = value
		})
		return prices
	}
}

const polygonWS = new PolygonWebSocket()
module.exports = polygonWS
