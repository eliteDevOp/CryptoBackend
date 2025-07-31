const polygonWS = require('../services/polygon/PolygonWebSocket')
const { getHistoricalPrices, searchCoins, getAllCoinData, createSignalDB, getAllSignalsDB, getMonthlySignalPerformance, getSignalPerformanceStats, getRecentSignalsWithStatus, getAllSignals } = require('../services/priceService')
const db = require('../config/db')
const { IconService, ICON_SOURCES } = require('../services/polygon/iconService');
const iconService = new IconService(ICON_SOURCES.COINGECKO);

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


async function getAllCoins(req, res) {
	try {
		const allCoins = await getAllCoinData();

		// Format coins to match CoinRanking structure as closely as possible
		const formattedCoins = allCoins.map((coin) => ({
			uuid: coin.uuid,
			symbol: coin.symbol,
			name: coin.name,
			color: getColorForSymbol(coin.symbol), // Custom function
			iconUrl: coin.iconUrl || iconService.getIconUrl(coin.symbol),
			marketCap: coin.marketCap ? String(coin.marketCap) : null,
			price: coin.price ? String(coin.price) : null,
			listedAt: getListedTimestamp(coin.symbol), // Custom function
			tier: 1,
			change: coin.change ? String(coin.change) : "0.00",
			rank: getRankForSymbol(coin.symbol), // Would need implementation
			sparkline: coin.sparkline ? coin.sparkline.map(String) : [],
			lowVolume: false, // Polygon doesn't provide this
			coinrankingUrl: `https://yourdomain.com/coin/${coin.symbol}`,
			'24hVolume': coin.volume ? String(coin.volume) : "0",
			btcPrice: "1", // Would need BTC conversion
			contractAddresses: [],
			isWrappedTrustless: false,
			wrappedTo: null,
			lastUpdated: coin.lastUpdated.toISOString()
		}));

		// Add stats (mock some values since Polygon doesn't provide these)
		const response = {
			status: "success",
			data: {
				stats: {
					total: formattedCoins.length,
					totalCoins: formattedCoins.length,
					totalMarkets: 0, // Not available from Polygon
					totalExchanges: 0, // Not available from Polygon
					totalMarketCap: calculateTotalMarketCap(formattedCoins), // Would need implementation
					total24hVolume: calculateTotal24hVolume(formattedCoins) // Would need implementation
				},
				coins: formattedCoins
			}
		};

		res.json(response);
	} catch (err) {
		console.error('Error in getAllCoins:', err);
		res.status(500).json({
			status: "error",
			message: "Failed to fetch all coins data",
			error:err.message
		});
	}
}

// Helper functions (implement these based on your needs)
function getColorForSymbol(symbol) {
	// Map of colors for common coins
	const colorMap = {
		BTC: '#f7931A',
		ETH: '#627EEA',
		BNB: '#F3BA2F',
		SOL: '#00FFA3',
		XRP: '#27A2DB'
	};
	return colorMap[symbol] || '#000000';
}

function getListedTimestamp(symbol) {
	// Map of listing dates for common coins
	const listedAtMap = {
		BTC: 1282089600, // July 2010
		ETH: 1438992000, // August 2015
		BNB: 1493596800, // May 2017
		SOL: 1596672000, // August 2020
		XRP: 1380758400  // October 2013
	};
	return listedAtMap[symbol] || Math.floor(Date.now() / 1000);
}

function calculateTotalMarketCap(coins) {
	return coins.reduce((sum, coin) => {
		return sum + (parseFloat(coin.marketCap) || 0);
	}, 0).toString();
}

function calculateTotal24hVolume(coins) {
	return coins.reduce((sum, coin) => {
		return sum + (parseFloat(coin['24hVolume']) || 0);
	}, 0).toString();
}

function getRankForSymbol(symbol) {
	// This would need actual ranking logic
	const rankMap = {
		BTC: 1,
		ETH: 2,
		BNB: 3,
		SOL: 4,
		XRP: 5
	};
	return rankMap[symbol] || 999;
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
	getAllCoins,
	updateStatus,
	createSignal,
	TopCoins
}
