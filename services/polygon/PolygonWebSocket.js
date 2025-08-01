const WebSocket = require('ws');
const { storePrice } = require('../priceService');
const symbolMapper = require('../../utils/symbolMapper');

class PolygonWebSocket {
	constructor() {
		this.activeSubscriptions = new Set();
		this.priceCache = new Map(); // Ensure this is initialized
		this.reconnectInterval = 5000;
		this.connected = false;
		this.apiKey = '78hO5g90HYMrUwS0sntujCmD3hH9YzNp';

		// Initialize immediately
		this.connect();
	}

	connect() {
		this.socket = new WebSocket('wss://socket.polygon.io/crypto');

		this.socket.on('open', () => {
			console.log('Connected to Polygon.io WebSocket');
			this.authenticate();
			this.connected = true;
		});

		this.socket.on('message', (data) => this.handleMessage(data));
		this.socket.on('close', () => this.handleDisconnect());
		this.socket.on('error', (err) => console.error('WebSocket error:', err));
	}

	authenticate() {
		this.socket.send(JSON.stringify({
			action: "auth",
			params: this.apiKey
		}));

		// Subscribe to all crypto pairs
		this.socket.send(JSON.stringify({
			action: 'subscribe',
			params: 'XT.*'
		}));
	}

	async handleMessage(data) {
		try {
			const message = JSON.parse(data);

			if (Array.isArray(message)) {
				message.forEach(event => this.processTradeEvent(event));
			} else if (message.ev === 'XT') {
				this.processTradeEvent(message);
			}
		} catch (err) {
			console.error('Error handling message:', err);
		}
	}

	processTradeEvent(event) {
		if (event.ev !== 'XT') return;

		const baseSymbol = symbolMapper.extractBaseSymbol(event.pair);
		const priceData = {
			symbol: baseSymbol,
			fullSymbol: event.pair,
			price: event.p,
			volume: event.s, // Size
			timestamp: new Date(event.t)
		};

		this.priceCache.set(baseSymbol, {
			price: priceData.price,
			volume: priceData.volume,
			timestamp: priceData.timestamp,
			lastUpdated: Date.now()
		});

		storePrice(priceData);
	}

	handleDisconnect() {
		this.connected = false;
		console.log('Disconnected - attempting reconnect');
		setTimeout(() => this.connect(), this.reconnectInterval);
	}

	getPrice(symbol) {
		return this.priceCache.get(symbol);
	}

	getAllPrices() {
		return Object.fromEntries(this.priceCache.entries());
	}
}

module.exports = new PolygonWebSocket();