const { query } = require('../config/db')

async function initializeDatabase() {
    try {
        await query(`
      CREATE INDEX idx_price_history_symbol_timestamp ON price_history(symbol, timestamp DESC);
      CREATE INDEX idx_price_history_timestamp ON price_history(timestamp);
    `)
        console.log('✅ Database tables created successfully')
    } catch (err) {
        console.error('❌ Error initializing database:', err)
        throw err
    }
}

module.exports = { initializeDatabase }