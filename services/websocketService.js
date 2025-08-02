const WebSocket = require('ws')
const { getAllCoinData } = require('./priceService')

class WebSocketService {
	constructor() {
		this.clients = new Set()
		this.wss = null
		this.updateInterval = 1000
	}

	initialize(server) {
		this.wss = new WebSocket.Server({ server })

		this.wss.on('connection', (ws) => {
			this.clients.add(ws)
			console.log('New client connected')

			this.sendMarketData(ws)

			ws.on('close', () => {
				this.clients.delete(ws)
				console.log('Client disconnected')
			})
		})

		setInterval(() => this.broadcastMarketData(), this.updateInterval)
	}

	async sendMarketData(ws) {
		try {
			const allCoins = await getAllCoinData()
         console.log(allCoins)
			const message = JSON.stringify({
				type: 'market_data',
				data: {
					stats: this.calculateMarketStats(allCoins),
					coins: allCoins
				}
			})
			ws.send(message)
		} catch (err) {
			console.error('Error sending market data:', err)
		}
	}

	async broadcastMarketData() {
		if (this.clients.size === 0) return

		try {
			const allCoins = await getAllCoinData()
			const message = JSON.stringify({
				type: 'market_update',
				data: {
					stats: this.calculateMarketStats(allCoins),
					coins: allCoins
				}
			})

			this.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send(message)
				}
			})
		} catch (err) {
			console.error('Error broadcasting market data:', err)
		}
	}

	calculateMarketStats(coins) {
		const totalMarketCap = coins.reduce((sum, coin) => sum + parseFloat(coin.marketCap || '0'), 0)
		const total24hVolume = coins.reduce((sum, coin) => sum + parseFloat(coin['24hVolume'] || '0'), 0)

		return {
			total: coins.length,
			totalCoins: coins.length,
			totalMarkets: 100,
			totalExchanges: 50,
			totalMarketCap: totalMarketCap.toString(),
			total24hVolume: total24hVolume.toString()
		}
	}
}

module.exports = new WebSocketService()
