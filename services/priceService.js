const { query } = require('../config/db')
const { symbolMappings } = require('./logoService')
const NodeCache = require('node-cache')
const coinDataCache = new NodeCache({ stdTTL: 60, checkperiod: 120 })

async function storePrice({ symbol, price, timestamp }) {
    try {
        // Changed $1, $2, $3 to ?, ?, ?
        await query('INSERT INTO price_history (symbol, price, timestamp) VALUES (?, ?, ?)', [symbol, price, timestamp])
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
        // Changed $1, $2 to ?, ?
        const result = await query('SELECT * FROM price_history WHERE symbol = ? ORDER BY timestamp DESC LIMIT ?', [symbol, limit])
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
    const cacheKey = 'allCoinData'
    const cachedData = coinDataCache.get(cacheKey)
    if (cachedData) return cachedData
    
    try {
        // Simplified SQLite-compatible query
        const result = await query(`
            SELECT DISTINCT
                symbol,
                price as current_price,
                0 as yesterday_price,
                0 as "24hVolume", 
                0 as high_24h,
                0 as low_24h,
                0 as change,
                timestamp as last_updated
            FROM price_history 
            WHERE rowid IN (
                SELECT max(rowid) 
                FROM price_history 
                GROUP BY symbol
            )
            ORDER BY symbol
        `)

        const data = await Promise.all(
            result.rows.map(async (row) => {
                const baseSymbol = row.symbol?.includes('-') ? row.symbol.split('-')[0] : row.symbol
                const coinData = symbolMappings[baseSymbol] || {}
                const currentTimestamp = Math.floor(Date.now() / 1000)
                return {
                    uuid: `polygon-${baseSymbol.toLowerCase()}`,
                    symbol: row.symbol,
                    name: coinData.name || baseSymbol,
                    iconUrl: null,
                    color: coinData.color || generateColorFromSymbol(baseSymbol),
                    marketCap: calculateMarketCap(row),
                    price: formatPrice(row.current_price),
                    listedAt: coinData?.launchDate || currentTimestamp,
                    tier: calculateTier(row),
                    change: formatPercentage(row.change),
                    sparkline: [],
                    lowVolume: isLowVolume(row['24hVolume'], row.market_cap),
                    coinrankingUrl: generateCoinrankingUrl(baseSymbol),
                    '24hVolume': formatVolume(row['24hVolume']),
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
        coinDataCache.set(cacheKey, data)
        return data
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

async function getCoinData(symbol) {
    try {
        // Changed $1 to ?
        const result = await query(
            `SELECT symbol, price
             FROM price_history
             WHERE symbol = ?
             ORDER BY timestamp DESC
             LIMIT 1`,
            [symbol]
        )
        if (result.rows.length === 0) {
            return null
        }

        const row = result.rows[0]
        console.log('Fetched coin data:', row)
        return { price: formatPrice(row.price), symbol: row.symbol }
    } catch (err) {
        console.error('Error fetching coin data:', err)
        return null
    }
}

module.exports = {
    storePrice,
    getAllCoinData,
    getCoinData
}