const { getAllCoinData, getCoinData } = require('../services/priceService')

async function getMarketStats(req, res) {
	try {
		const allCoins = await getAllCoinData()
		const totalMarketCap = allCoins.reduce((sum, coin) => sum + parseFloat(coin.marketCap || '0'), 0)
		const total24hVolume = allCoins.reduce((sum, coin) => sum + parseFloat(coin['24hVolume'] || '0'), 0)

		res.json({
			status: 'success',
			data: {
				stats: {
					total: allCoins.length,
					totalCoins: allCoins.length,
					totalMarkets: 100,
					totalExchanges: 50,
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

async function getCoinPrice(req, res) {
	try {
		const { symbol } = req.query
		if (!symbol) {
			return res.status(400).json({ error: 'Symbol parameter is required' })
		}

		const coinData = await getCoinData(symbol.toUpperCase())
		if (!coinData) {
			return res.status(404).json({ error: 'Coin not found or no data available' })
		}

		res.json(coinData)
	} catch (err) {
		console.error('Error in getCoinPrice:', err)
		res.status(500).json({ error: 'Failed to fetch coin data' })
	}
}

module.exports = {
	getMarketStats,
	getCoinPrice
}
