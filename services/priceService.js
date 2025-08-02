const db = require('../config/db')
const { query, pool } = require('../config/db')
const polygonWS = require('../websocket/polygonWS')
const { symbolMappings, getCoinIcon } = require('./logoService')

async function storePrice({ symbol, price, timestamp }) {
	try {
		await query('INSERT INTO price_history (symbol, price, timestamp) VALUES ($1, $2, $3)', [symbol, price, timestamp])
	} catch (err) {
		console.error('Error storing price:', err)
	}
}

function generateColorFromSymbol(symbol) {
	const hash = Array.from(symbol).reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0)
	return `hsl(${Math.abs(hash % 360)}, 70%, 50%)`
}

function calculateMarketCap(row) {
	if (row.market_cap) return row.market_cap.toString()
	if (row.circulating_supply && row.current_price) {
		return (row.circulating_supply * row.current_price).toString()
	}
	return null
}

function calculateTier(row) {
	const marketCap = parseFloat(row.market_cap) || (row.circulating_supply && row.current_price ? row.circulating_supply * row.current_price : 0)

	if (marketCap > 1e10) return 1
	if (marketCap > 1e9) return 2
	return 3
}

async function getHistoricalPrices(symbol, limit = 100) {
	try {
		const result = await query('SELECT * FROM price_history WHERE symbol = $1 ORDER BY timestamp DESC LIMIT $2', [symbol, limit])
		return result.rows
	} catch (err) {
		console.error('Error fetching historical prices:', err)
		return []
	}
}

async function getSparklineData(symbol, days = 7) {
	try {
		const history = await getHistoricalPrices(symbol, days)
		return history.map((h) => h.price.toString())
	} catch (error) {
		console.error(`Error fetching sparkline for ${symbol}:`, error.message)
		return Array(days).fill('0')
	}
}

function isLowVolume(volume, marketCap) {
	if (!volume || !marketCap) return false
	const ratio = parseFloat(volume) / parseFloat(marketCap)
	return ratio < 0.01
}

function checkIfWrappedTrustless(symbol) {
	return symbol.startsWith('W') || symbol.startsWith('w') || symbolMappings[symbol]?.isWrapped || false
}

function getWrappedTo(symbol) {
	if (symbol.startsWith('W') || symbol.startsWith('w')) {
		return symbol.slice(1)
	}
	return symbolMappings[symbol]?.wrappedTo || null
}
async function getAllCoinData() {
	try {
		const result = await query(
			`
      WITH latest_prices AS (
        SELECT 
          ph.symbol,
          ph.price,
          ph.timestamp,
          ROW_NUMBER() OVER (PARTITION BY ph.symbol ORDER BY ph.timestamp DESC) as rn
        FROM price_history ph
        WHERE ph.timestamp > NOW() - INTERVAL '1 hour'
      ),
      yesterday_prices AS (
        SELECT 
          ph.symbol,
          ph.price,
          ROW_NUMBER() OVER (PARTITION BY ph.symbol ORDER BY ph.timestamp DESC) as rn
        FROM price_history ph
        WHERE ph.timestamp BETWEEN NOW() - INTERVAL '25 hours' AND NOW() - INTERVAL '24 hours'
      ),
      volume_data AS (
        SELECT 
          ph.symbol,
          COUNT(*) as volume,
          MAX(ph.price) as high_24h,
          MIN(ph.price) as low_24h
        FROM price_history ph
        WHERE ph.timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY ph.symbol
      )
      SELECT 
        lp.symbol,
        lp.price as current_price,
        yp.price as yesterday_price,
        vd.volume as "24hVolume",
        vd.high_24h,
        vd.low_24h,
        ((lp.price - yp.price) / yp.price * 100) as change,
        lp.timestamp as last_updated
      FROM latest_prices lp
      LEFT JOIN yesterday_prices yp ON lp.symbol = yp.symbol AND yp.rn = 1
      LEFT JOIN volume_data vd ON lp.symbol = vd.symbol
      WHERE lp.rn = 1
      ORDER BY lp.symbol
    `,
			[],
			5000
		)

		return await Promise.all(
			result.rows.map(async (row) => {
				const baseSymbol = row.symbol?.includes('-') ? row.symbol.split('-')[0] : row.symbol
				const coinData = symbolMappings[baseSymbol] || {}
				const currentTimestamp = Math.floor(Date.now() / 1000)
				return {
					uuid: `polygon-${baseSymbol.toLowerCase()}`,
					symbol: row.symbol,
					name: coinData.name || baseSymbol,
					iconUrl: baseSymbol,
					color: coinData.color || generateColorFromSymbol(baseSymbol),
					marketCap: calculateMarketCap(row),
					price: formatPrice(row.current_price),
					listedAt: coinData?.launchDate || currentTimestamp,
					tier: calculateTier(row),
					change: formatPercentage(row.change),
					iconUrl: baseSymbol,
					sparkline: (await getSparklineData(baseSymbol)) || generatePlaceholderSparkline(),
					lowVolume: isLowVolume(row.volume_24h, row.market_cap),
					coinrankingUrl: generateCoinrankingUrl(baseSymbol),
					'24hVolume': formatVolume(row.volume_24h),
					btcPrice: '0',
					contractAddresses: [],
					isWrappedTrustless: checkIfWrappedTrustless(baseSymbol),
					wrappedTo: getWrappedTo(baseSymbol),
					high_24h: formatPrice(row.high_24h),
					low_24h: formatPrice(row.low_24h),
					lastUpdated: row.last_updated || currentTimestamp
				}
			})
		)
	} catch (err) {
		console.error('Error fetching all coin data:', err)
		return []
	}
}
function formatPrice(price) {
	if (!price) return '0'
	return parseFloat(price)
		.toFixed(8)
		.replace(/\.?0+$/, '')
}

function formatPercentage(change) {
	if (!change) return '0'
	return parseFloat(change).toFixed(2)
}

function formatVolume(volume) {
	if (!volume) return '0'
	if (volume > 1000000) return `${(volume / 1000000).toFixed(2)}M`
	if (volume > 1000) return `${(volume / 1000).toFixed(2)}K`
	return volume.toString()
}

function generateCoinrankingUrl(symbol) {
	const slug = symbolMappings[symbol]?.slug || symbol.toLowerCase()
	return `https://coinranking.com/coin/${slug}-${symbol.toLowerCase()}`
}

module.exports = {
	storePrice,
	getAllCoinData
}
