const polygonWS = require("../websocket/polygonWS")
const { getHistoricalPrices, searchCoins, getAllCoinData, createSignalDB } = require("../services/priceService")

async function getCurrentPrice(req, res) {
	const { symbol } = req.params
	const priceData = polygonWS.getPrice(symbol)

	if (!priceData) {
		return res.status(404).json({ error: "Symbol not found or not updated yet" })
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
		res.status(500).json({ error: "Failed to fetch price history" })
	}
}

async function searchCoin(req, res) {
	try {
		const { query } = req.query
		if (!query || query.length < 2) {
			return res.status(400).json({ error: "Search query must be at least 2 characters" })
		}

		const results = await searchCoins(query)
		res.json(results)
	} catch (err) {
		res.status(500).json({ error: "Failed to search coins" })
	}
}

async function getAllCoins(req, res) {
	try {
		const allCoins = await getAllCoinData()

		const formattedCoins = allCoins.map((coin) => ({
			name: coin.name,
			symbol: coin.symbol,
			price: coin.price,
			volume: coin.volume,
			change24h: coin.change24h
		}))

		res.json(formattedCoins)
	} catch (err) {
		res.status(500).json({ error: "Failed to fetch all coins data" })
	}
}

async function getTopPerformingCoins(req, res) {
	try {
		const limit = parseInt(req.query.limit) || 10
		const allCoins = await getAllCoinData()

		// Sort by 24h change (descending)
		const sortedCoins = [...allCoins].sort((a, b) => b.change24h - a.change24h)

		// Get top coins
		const topCoins = sortedCoins.slice(0, limit).map((coin) => ({
			name: coin.name,
			symbol: coin.symbol,
			price: coin.price,
			volume: coin.volume,
			change24h: coin.change24h
		}))

		res.json(topCoins)
	} catch (err) {
		res.status(500).json({ error: "Failed to fetch top performing coins" })
	}
}

async function createSignal(req, res) {
	try {
		const { symbol, stopLoss, target } = req.body
		const userId = req.user.id // Assuming auth middleware adds user to req

		if (!symbol || isNaN(stopLoss) || isNaN(target)) {
			return res.status(400).json({ error: "Valid symbol, stopLoss and target are required" })
		}

		const newSignal = await createSignalDB({
			userId,
			symbol,
			stopLoss: parseFloat(stopLoss),
			target: parseFloat(target)
		})

		res.status(201).json(newSignal)
	} catch (err) {
		res.status(500).json({ error: "Failed to create signal" })
	}
}

module.exports = {
	getCurrentPrice,
	getAllPrices,
	getPriceHistory,
	searchCoin,
	getAllCoins,
	getTopPerformingCoins,
	createSignal
}
