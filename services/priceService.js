const db = require('../config/db')
const { query, pool } = require('../config/db')
const { symbolMappings, getLogoUrl } = require('./logoService')

async function storePrice({ symbol, price, timestamp }) {
	try {
		await query('INSERT INTO price_history (symbol, price, timestamp) VALUES ($1, $2, $3)', [symbol, price, timestamp])
	} catch (err) {
		console.error('Error storing price:', err)
	}
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

const priceCache = new Map()

function updateCache(symbol, price, timestamp) {
	priceCache.set(symbol, {
		price,
		timestamp,
		lastUpdated: Date.now()
	})
}

async function searchCoins(searchTerm) {
	try {
		const result = await query(
			`SELECT DISTINCT ON (symbol) symbol, price
   FROM price_history
   WHERE symbol ILIKE $1
   ORDER BY symbol, created_at DESC
   LIMIT 10`,
			[`%${searchTerm}%`]
		)

		return result.rows
	} catch (err) {
		console.error('Search error:', err)
		throw err
	}
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

		// Add mock/sparkline data (you'll need to implement this separately)
		const sparklineData = await getSparklineData()

		return result.rows.map((row) => ({
			uuid: `polygon-${row.symbol.toLowerCase()}`, // Mock UUID
			symbol: row.symbol,
			name: symbolMappings[row.symbol]?.name || row.symbol,
			iconUrl: getLogoUrl(row.symbol),
			color: '#000000', // Default color
			marketCap: '0', // Polygon doesn't provide market cap
			price: row.current_price.toString(),
			listedAt: Math.floor(Date.now() / 1000), // Current timestamp
			tier: 1, // Default tier
			change: row.change?.toString() || '0',
			rank: 0, // You'd need to implement ranking
			sparkline: sparklineData[row.symbol] || Array(7).fill('0'), // Mock sparkline
			lowVolume: false, // You'd need to determine this
			coinrankingUrl: `https://coinranking.com/coin/polygon-${row.symbol.toLowerCase()}+${row.symbol.toLowerCase()}`,
			'24hVolume': row['24hVolume']?.toString() || '0',
			btcPrice: '0', // You'd need BTC pairing
			contractAddresses: [],
			isWrappedTrustless: false,
			wrappedTo: null,
			high_24h: row.high_24h?.toString() || row.current_price.toString(),
			low_24h: row.low_24h?.toString() || row.current_price.toString(),
			lastUpdated: row.last_updated
		}))
	} catch (err) {
		console.error('Error fetching all coin data:', err)
		return []
	}
}

// Add this new function to priceService.js
async function getSparklineData() {
	try {
		// This is a simplified version - you'd need to implement proper sparkline calculation
		const result = await query(`
      SELECT 
        symbol,
        ARRAY_AGG(price ORDER BY timestamp DESC LIMIT 7) as sparkline
      FROM price_history
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY symbol
    `)

		const sparklines = {}
		result.rows.forEach((row) => {
			sparklines[row.symbol] = row.sparkline.map((p) => p.toString())
		})
		return sparklines
	} catch (err) {
		console.error('Error fetching sparkline data:', err)
		return {}
	}
}
async function createSignalDB({ symbol, stopLoss, target, price }) {
	const result = await db.query('INSERT INTO signals (symbol, stop_loss, target, price) VALUES ($1, $2, $3, $4) RETURNING id', [symbol, stopLoss, target, price])

	return {
		id: result.rows[0].id,
		symbol,
		stopLoss,
		target,
		price
	}
}

async function getAllSignalsDB() {
	const result = await db.query('SELECT * FROM signals')
	return result.rows
}

async function getSignalPerformanceStats() {
	const result = await query(`
		WITH stats AS (
			SELECT
				COUNT(*) FILTER (WHERE status IS NOT NULL) AS total_closed,
				COUNT(*) FILTER (WHERE status = 'hit_target') AS successful,
				COUNT(*) FILTER (WHERE status = 'hit_stop') AS failed,
				SUM(
					CASE 
						WHEN exit_price IS NOT NULL AND entry_price IS NOT NULL 
						THEN exit_price - entry_price 
						ELSE 0 
					END
				) AS total_profit
			FROM signals
		)
		SELECT 
			total_closed,
			successful,
			failed,
			total_profit,
			ROUND(CASE WHEN total_closed > 0 THEN (successful::decimal / total_closed) * 100 ELSE 0 END, 2) AS success_percentage,
			ROUND(CASE WHEN total_closed > 0 THEN (failed::decimal / total_closed) * 100 ELSE 0 END, 2) AS fail_percentage
		FROM stats;
	`)
	return result.rows[0]
}

async function getRecentSignalsWithStatus(limit = 10) {
	const result = await query(
		`
    WITH latest_price AS (
      SELECT DISTINCT ON (symbol) symbol, price, timestamp
      FROM price_history
      ORDER BY symbol, timestamp DESC
    ),
    yesterday_price AS (
      SELECT DISTINCT ON (symbol) symbol, price AS price_24h
      FROM price_history
      WHERE timestamp < NOW() - INTERVAL '24 hours'
      ORDER BY symbol, timestamp DESC
    )
    SELECT 
      s.id,
      s.symbol,
      s.status,
      lp.price AS current_price,
      yp.price_24h,
      ROUND(
        CASE 
          WHEN yp.price_24h IS NULL THEN 0
          ELSE ((lp.price - yp.price_24h) / yp.price_24h) * 100
        END, 
        2
      ) AS change_24h,
      s.created_at
    FROM signals s
    LEFT JOIN latest_price lp ON s.symbol = lp.symbol
    LEFT JOIN yesterday_price yp ON s.symbol = yp.symbol
    ORDER BY s.created_at DESC
    LIMIT $1
    `,
		[limit]
	)

	return result.rows.map((row) => ({
		symbol: row.symbol,
		change24h: row.change_24h,
		status: row.status || 'active',
		price: row.current_price,
		created_at: row.created_at
	}))
}

async function getMonthlySignalPerformance() {
	const result = await query(`
		SELECT 
			TO_CHAR(created_at, 'YYYY-MM') AS month,
			COUNT(*) AS total_signals,
			SUM(
				CASE WHEN exit_price IS NOT NULL AND entry_price IS NOT NULL
				THEN exit_price - entry_price ELSE 0 END
			) AS total_profit
		FROM signals
		GROUP BY 1
		ORDER BY 1 DESC
	`)
	return result.rows
}

async function getAllSignals() {
	try {
		const result = await query(`
      SELECT 
        s.*,
        ph.price AS current_price
      FROM signals s
      LEFT JOIN (
        SELECT DISTINCT ON (symbol) symbol, price
        FROM price_history
        ORDER BY symbol, timestamp DESC
      ) ph ON s.symbol = ph.symbol
      ORDER BY s.created_at DESC
    `)

		return result.rows.map((signal) => ({
			id: signal.id,
			symbol: signal.symbol,
			stopLoss: signal.stop_loss,
			target: signal.target,
			entryPrice: signal.price,
			currentPrice: signal.current_price,
			status: signal.status || 'active',
			exitPrice: signal.exit_price,
			createdAt: signal.created_at,
			updatedAt: signal.updated_at,
			// Calculate progress towards target
			progressToTarget: signal.current_price ? ((signal.current_price - signal.price) / (signal.target - signal.price)) * 100 : 0,
			// Calculate progress towards stop loss
			progressToStop: signal.current_price ? ((signal.current_price - signal.price) / (signal.stop_loss - signal.price)) * 100 : 0
		}))
	} catch (err) {
		console.error('Error fetching all signals:', err)
		return []
	}
}

module.exports = {
	storePrice,
	getHistoricalPrices,
	searchCoins,
	priceCache,
	updateCache,
	getAllCoinData,
	getAllSignalsDB,
	createSignalDB,
	getSparklineData,
	getMonthlySignalPerformance,
	getSignalPerformanceStats,
	getRecentSignalsWithStatus,
	getAllSignals
}
