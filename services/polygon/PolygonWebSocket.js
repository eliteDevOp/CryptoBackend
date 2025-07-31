const WebSocket = require('ws')
const { storePrice } = require('../priceService')
const symbolMapper = require('../../utils/symbolMapper')

class PolygonWebSocket {
	constructor() {
		this.activeSubscriptions = new Set()
		this.priceCache = new Map()
		this.reconnectInterval = 5000
		this.connected = false
		this.connectionAttempts = 0
		this.maxConnectionAttempts = 10
		this.apiKey = '78hO5g90HYMrUwS0sntujCmD3hH9YzNp'

		// Initialize immediately
		this.connect()
	}

	connect() {
		this.connectionAttempts++
		console.log(`Attempting connection (${this.connectionAttempts}/${this.maxConnectionAttempts})`)

		this.socket = new WebSocket('wss://socket.polygon.io/crypto')

		this.socket.on('open', () => {
			console.log('Connected to Polygon.io WebSocket')
			this.connectionAttempts = 0
			this.authenticate()
			this.connected = true
		})

		this.socket.on('message', (data) => this.handleMessage(data))
		this.socket.on('close', () => this.handleDisconnect())
		this.socket.on('error', (err) => console.error('WebSocket error:', err))
	}

	authenticate() {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			console.error('Cannot authenticate - WebSocket not ready')
			return
		}

		this.socket.send(
			JSON.stringify({
				action: 'auth',
				params: this.apiKey
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

	async handleMessage(data) {
		try {
			const message = JSON.parse(data)
			console.debug('Received message:', message)

			if (Array.isArray(message)) {
				message.forEach((event) => this.processTradeEvent(event))
			} else if (message.ev === 'XT') {
				this.processTradeEvent(message)
			} else if (message.ev === 'status') {
				console.log('Polygon status:', message.message)
			}
		} catch (err) {
			console.error('Error handling message:', err)
		}
	}

	processTradeEvent(event) {
		if (event.ev !== 'XT') return

		const baseSymbol = symbolMapper.extractBaseSymbol(event.pair)
		const priceData = {
			symbol: baseSymbol,
			fullSymbol: event.pair,
			price: event.p,
			volume: event.s,
			timestamp: new Date(event.t)
		}

		console.log(`Updating price for ${baseSymbol}: ${priceData.price}`)

		this.priceCache.set(baseSymbol, {
			price: priceData.price,
			volume: priceData.volume,
			timestamp: priceData.timestamp,
			lastUpdated: Date.now()
		})

		storePrice(priceData)
	}

	handleDisconnect() {
		this.connected = false
		if (this.connectionAttempts < this.maxConnectionAttempts) {
			console.log(`Disconnected - attempting reconnect (${this.connectionAttempts}/${this.maxConnectionAttempts})`)
			setTimeout(() => this.connect(), this.reconnectInterval)
		} else {
			console.error('Max connection attempts reached. Please check your API key and network connection.')
		}
	}

	getPrice(symbol) {
		return this.priceCache.get(symbol)
	}

	getAllPrices() {
		return Object.fromEntries(this.priceCache.entries())
	}

	isConnected() {
		return this.connected
	}
}

module.exports = new PolygonWebSocket()
