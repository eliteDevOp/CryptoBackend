const db = require('../config/db')
const { query, pool } = require('../config/db')
const polygonWebSocket = require('./polygon/PolygonWebSocket');
const polygonRest = require('./polygon/PolygonRestService');
const { IconService, ICON_SOURCES } = require('./polygon/iconService');
const symbolMapper = require('../utils/symbolMapper');


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

const iconService = new IconService(ICON_SOURCES.COINGECKO);

async function storePrice(priceData) {
	// Implement your database storage logic here
	console.log('Storing price:', priceData);
}

async function getFullCoinData(symbol) {
	const [wsData, aggregates, details] = await Promise.all([
		polygonWebSocket.getPrice(symbol),
		polygonRest.getAggregates(symbol, 'hour', getDateString(-7), getDateString()),
		polygonRest.getTickerDetails(symbol)
	]);

	const sparkline = aggregates?.results?.map(r => r.c) || [];
	const change24h = sparkline.length > 1
		? ((sparkline[sparkline.length - 1] - sparkline[0]) / sparkline[0] * 100).toFixed(2)
		: 0;

	return {
		uuid: `polygon-${symbol}`,
		symbol,
		name: details?.results?.name || symbol,
		price: wsData?.price || null,
		iconUrl: iconService.getIconUrl(symbol),
		change: change24h,
		sparkline,
		volume: wsData?.volume || 0,
		marketCap: null, // Polygon doesn't provide this
		lastUpdated: wsData?.timestamp || new Date()
	};
}

async function getAllCoinData() {
	try {
		// Add null check for polygonWebSocket and priceCache
		if (!polygonWebSocket || !polygonWebSocket.priceCache) {
			console.error('WebSocket or priceCache not initialized');
			return [];
		}

		// Get symbols safely
		const symbols = polygonWebSocket.priceCache
			? Array.from(polygonWebSocket.priceCache.keys())
			: [];

		if (symbols.length === 0) {
			console.warn('No symbols found in priceCache');
			return [];
		}

		const coinData = await Promise.all(
			symbols.map(symbol => getFullCoinData(symbol))
		);

		return coinData.filter(coin => coin.price !== null);
	} catch (err) {
		console.error('Error in getAllCoinData:', err);
		return [];
	}
}

function getDateString(daysOffset = 0) {
	const date = new Date();
	if (daysOffset) date.setDate(date.getDate() + daysOffset);
	return date.toISOString().split('T')[0];
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
	storePrice,
	getFullCoinData,
	getAllCoinData, getAllSignalsDB,
	createSignalDB,
	getMonthlySignalPerformance,
	getSignalPerformanceStats,
	getRecentSignalsWithStatus,
	getAllSignals
}
