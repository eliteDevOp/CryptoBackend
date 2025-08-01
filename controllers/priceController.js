const polygonWS = require('../websocket/polygonWS')
const { getHistoricalPrices, searchCoins, getAllCoinData, createSignalDB, getAllSignalsDB, getMonthlySignalPerformance, getSignalPerformanceStats, getRecentSignalsWithStatus, getAllSignals } = require('../services/priceService')
const db = require('../config/db')

async function getCurrentPrice(req, res) {
	const { symbol } = req.params
	const priceData = polygonWS.getPrice(symbol)

	if (!priceData) {
		return res.status(404).json({ error: 'Symbol not found or not updated yet' })
	}

	res.json({
		symbol,
		price: priceData.price,
		timestamp: priceData.timestamp
	})
}

async function getAllPrices(req, res) {
	res.json(polygonWS.getAllPrices())
}

async function getPriceHistory(req, res) {
	try {
		const { symbol } = req.params
		const limit = parseInt(req.query.limit) || 100
		const history = await getHistoricalPrices(symbol, limit)
		res.json(history)
	} catch (err) {
		res.status(500).json({ error: 'Failed to fetch price history' })
	}
}

async function searchCoin(req, res) {
	try {
		const { query } = req.query
		if (!query || query.length < 2) {
			return res.status(400).json({ error: 'Search query must be at least 2 characters' })
		}

		const results = await searchCoins(query)
		res.json(results)
	} catch (err) {
		res.status(500).json({ error: 'Failed to search coins' })
	}
}

async function getMarketStats(req, res) {
	try {
		const allCoins = await getAllCoinData()

		// Calculate some mock stats since Polygon doesn't provide these
		const totalMarketCap = allCoins.reduce((sum, coin) => sum + parseFloat(coin.marketCap || '0'), 0)
		const total24hVolume = allCoins.reduce((sum, coin) => sum + parseFloat(coin['24hVolume'] || '0'), 0)

		res.json({
			status: 'success',
			data: {
				stats: {
					total: allCoins.length,
					totalCoins: allCoins.length,
					totalMarkets: 100, // Mock value
					totalExchanges: 50, // Mock value
					totalMarketCap: totalMarketCap.toString(),
					total24hVolume: total24hVolume.toString()
				},
				coins: allCoins
			}
		})
	} catch (err) {
		res.status(500).json({ error: 'Failed to fetch market stats' })
	}
}

// Update getAllCoins to match CoinRanking format
async function getAllCoins(req, res) {
	try {
		const allCoins = await getAllCoinData()

		res.json({
			status: 'success',
			data: {
				coins: allCoins,
				stats: {
					total: allCoins.length
				}
			}
		})
	} catch (err) {
		res.status(500).json({
			status: 'error',
			message: 'Failed to fetch all coins data'
		})
	}
}

async function createSignal(req, res) {
	try {
		const { symbol, stopLoss, target, price } = req.body

		if (!symbol || isNaN(stopLoss) || isNaN(target)) {
			return res.status(400).json({ error: 'Valid symbol, stopLoss, and target are required' })
		}

		const newSignal = await createSignalDB({
			symbol,
			stopLoss: parseFloat(stopLoss),
			target: parseFloat(target),
			price
		})

		res.status(201).json(newSignal)
	} catch (err) {
		res.status(500).json({ error: 'Failed to create signal', err: err.message })
	}
}

async function getFullSignalDashboard(req, res) {
	try {
		const [signals, stats, monthlyPerformance, recentSignals, allCoins] = await Promise.all([getAllSignalsDB(), getSignalPerformanceStats(), getMonthlySignalPerformance(), getRecentSignalsWithStatus(10), getAllCoinData()])

		const sortedCoins = [...allCoins].sort((a, b) => b.change24h - a.change24h)

		const topCoins = sortedCoins.slice(0, 10).map((coin) => ({
			name: coin.name,
			symbol: coin.symbol,
			price: coin.price,
			volume: coin.volume,
			change24h: coin.change24h
		}))

		res.json({
			signals,
			stats,
			monthlyPerformance,
			recentSignals,
			topCoins
		})
	} catch (err) {
		res.status(500).json({
			error: 'Failed to fetch full signal dashboard',
			message: err.message
		})
	}
}

async function TopCoins(req, res) {
	try {
		const allCoins = await getAllCoinData()

		const sortedCoins = allCoins.sort((a, b) => b.change24h - a.change24h)

		const topCoins = sortedCoins.slice(0, 10).map((coin) => ({
			name: coin.name,
			symbol: coin.symbol,
			price: coin.price,
			volume: coin.volume,
			change24h: coin.change24h
		}))

		res.json({
			topCoins
		})
	} catch (err) {
		res.status(500).json({
			error: 'Failed to fetch top coins',
			message: err.message
		})
	}
}

async function getRecentSignals(req, res) {
	try {
		const recentSignals = await getAllSignals()
		res.json({
			data: recentSignals
		})
	} catch (err) {
		res.status(500).json({
			error: 'Failed to fetch active signals',
			message: err.message
		})
	}
}

async function updateStatus(req, res) {
	try {
		const { id, status } = req.body

		if (!id || !status) {
			return res.status(400).json({ error: 'Missing id or status in request body' })
		}

		const result = await db.query('UPDATE signals SET status = $1 WHERE id = $2 RETURNING *', [status, id])

		if (result.rowCount === 0) {
			return res.status(404).json({ error: 'Signal not found' })
		}

		res.status(200).json({
			message: 'Signal status updated successfully',
			signal: result.rows[0]
		})
	} catch (err) {
		console.error('Error updating signal status:', err)
		res.status(500).json({
			error: 'Failed to update signal status',
			message: err.message
		})
	}
}

module.exports = {
	getFullSignalDashboard,
	getCurrentPrice,
	getAllPrices,
	getRecentSignals,
	getPriceHistory,
	searchCoin,
	getMarketStats,
	getAllCoins,
	updateStatus,
	createSignal,
	TopCoins
}
