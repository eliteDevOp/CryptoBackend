const { query } = require('../config/db')

class Price {
	static async create({ symbol, price, timestamp }) {
		await query('INSERT INTO price_history (symbol, price, timestamp) VALUES ($1, $2, $3)', [symbol, price, timestamp])
	}

	static async findBySymbol(symbol, limit = 100) {
		const result = await query('SELECT * FROM price_history WHERE symbol = $1 ORDER BY timestamp DESC LIMIT $2', [symbol, limit])
		return result.rows
	}

	static async getLatestPrices(limit = 100) {
		const result = await query(
			`SELECT DISTINCT ON (symbol) symbol, price, timestamp 
       FROM price_history 
       ORDER BY symbol, timestamp DESC 
       LIMIT $1`,
			[limit]
		)
		return result.rows
	}
}

module.exports = Price
