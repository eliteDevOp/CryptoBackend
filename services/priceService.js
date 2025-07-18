const { query, pool } = require("../config/db")

async function storePrice({ symbol, price, timestamp }) {
	try {
		await query("INSERT INTO price_history (symbol, price, timestamp) VALUES ($1, $2, $3)", [symbol, price, timestamp])
	} catch (err) {
		console.error("Error storing price:", err)
	}
}

async function getHistoricalPrices(symbol, limit = 100) {
	try {
		const result = await query("SELECT * FROM price_history WHERE symbol = $1 ORDER BY timestamp DESC LIMIT $2", [symbol, limit])
		return result.rows
	} catch (err) {
		console.error("Error fetching historical prices:", err)
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
			`SELECT DISTINCT symbol 
       FROM price_history 
       WHERE symbol ILIKE $1
       ORDER BY symbol
       LIMIT 10`,
			[`%${searchTerm}%`]
		)

		return result.rows
	} catch (err) {
		console.error("Search error:", err)
		throw err
	}
}

async function getAllCoinData() {
	try {
		// Get the latest price for each symbol along with 24h change data
		const result = await query(`
      WITH latest_prices AS (
        SELECT 
          symbol,
          price,
          timestamp,
          ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
        FROM price_history
      ),
      yesterday_prices AS (
        SELECT 
          symbol,
          price,
          timestamp,
          ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
        FROM price_history
        WHERE timestamp < NOW() - INTERVAL '24 hours'
      ),
      volume_data AS (
        SELECT 
          symbol,
          COUNT(*) as volume,
          MAX(timestamp) as last_trade
        FROM price_history
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY symbol
      )
      SELECT 
        lp.symbol,
        lp.price as current_price,
        yp.price as yesterday_price,
        vd.volume,
        ((lp.price - yp.price) / yp.price * 100) as change_24h,
        lp.timestamp as last_updated
      FROM latest_prices lp
      LEFT JOIN yesterday_prices yp ON lp.symbol = yp.symbol AND yp.rn = 1
      LEFT JOIN volume_data vd ON lp.symbol = vd.symbol
      WHERE lp.rn = 1
      ORDER BY lp.symbol
    `)

		return result.rows.map((row) => ({
			symbol: row.symbol,
			name: row.symbol, // You might want to add a proper name mapping
			price: row.current_price,
			volume: row.volume || 0,
			change24h: row.change_24h || 0,
			lastUpdated: row.last_updated
		}))
	} catch (err) {
		console.error("Error fetching all coin data:", err)
		return []
	}
}

async function createSignalDB({ userId, symbol, stopLoss, target }) {
	try {
		const result = await query(
			`INSERT INTO signals 
       (user_id, symbol, stop_loss, target, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING *`,
			[userId, symbol, stopLoss, target]
		)
		return result.rows[0]
	} catch (err) {
		console.error("Error creating signal:", err)
		throw err
	}
}

module.exports = {
	storePrice,
	getHistoricalPrices,
	searchCoins,
	priceCache,
	updateCache,
	getAllCoinData,
	createSignalDB
}
