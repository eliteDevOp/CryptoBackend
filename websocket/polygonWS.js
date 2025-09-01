const WebSocket = require('ws')
const { storePrice } = require('../services/priceService')

class PolygonWebSocket {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.POLYGON_API_KEY || 'wvoG6BsdwGxbmrpSuxFaruaqp4yzB3sY'
        this.socket = null
        this.activeSubscriptions = new Set()
        this.priceCache = new Map()
        this.reconnectInterval = 5000
        this.maxReconnectDelay = 30000
        this.reconnectAttempts = 0
        this.maxReconnectAttempts = 10
        this.connected = false
        this.authenticated = false
        this.heartbeatInterval = null
        this.connectionTimeout = null
    }

    connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected')
            return
        }

        console.log('Connecting to Polygon.io WebSocket...')
        this.socket = new WebSocket('wss://socket.polygon.io/crypto')

        // Set connection timeout
        this.connectionTimeout = setTimeout(() => {
            if (!this.connected) {
                console.log('Connection timeout - closing socket')
                this.socket.terminate()
            }
        }, 10000)

        this.socket.on('open', () => {
            console.log('✅ Connected to Polygon.io WebSocket')
            this.connected = true
            this.reconnectAttempts = 0
            this.clearConnectionTimeout()
            this.authenticate()
        })

        this.socket.on('message', (data) => {
            try {
                const messages = JSON.parse(data)
                this.handleMessages(messages)
            } catch (err) {
                console.error('❌ Error parsing WebSocket message:', err)
                console.log('Raw message:', data.toString())
            }
        })

        this.socket.on('close', (code, reason) => {
            this.connected = false
            this.authenticated = false
            this.clearConnectionTimeout()
            this.clearHeartbeat()
            
            console.log(`❌ WebSocket closed. Code: ${code}, Reason: ${reason}`)
            
            // Don't reconnect if explicitly closed
            if (code !== 1000) {
                this.scheduleReconnect()
            }
        })

        this.socket.on('error', (err) => {
            console.error('❌ WebSocket error:', err.message)
            this.connected = false
            this.authenticated = false
        })
    }

    authenticate() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.log('❌ Cannot authenticate - socket not open')
            return
        }

        console.log('🔐 Authenticating with Polygon.io...')
        
        try {
            this.socket.send(JSON.stringify({
                action: 'auth',
                params: this.apiKey
            }))
        } catch (err) {
            console.error('❌ Error sending auth message:', err)
        }
    }

    subscribe() {
        if (!this.authenticated || !this.connected) {
            console.log('❌ Cannot subscribe - not authenticated or connected')
            return
        }

        console.log('📡 Subscribing to crypto trades...')
        
        try {
            // Subscribe to major crypto pairs
            const subscriptions = [
                'XT.BTC-USD',
                'XT.ETH-USD', 
                'XT.ADA-USD',
                'XT.DOT-USD',
                'XT.LINK-USD',
                'XT.LTC-USD',
                'XT.XRP-USD',
                'XT.BCH-USD',
                'XT.BNB-USD',
                'XT.SOL-USD'
            ]

            this.socket.send(JSON.stringify({
                action: 'subscribe',
                params: subscriptions.join(',')
            }))

            subscriptions.forEach(sub => this.activeSubscriptions.add(sub))
            
        } catch (err) {
            console.error('❌ Error subscribing:', err)
        }
    }

    handleMessages(messages) {
        if (!Array.isArray(messages)) {
            messages = [messages]
        }

        messages.forEach(message => {
            this.handleMessage(message)
        })
    }

    handleMessage(message) {
        try {
            switch(message.ev) {
                case 'status':
                    this.handleStatusMessage(message)
                    break
                    
                case 'XT':
                    this.handleTradeMessage(message)
                    break
                    
                default:
                    console.log('📥 Received message:', JSON.stringify(message))
            }
        } catch (err) {
            console.error('❌ Error handling message:', err)
        }
    }

    handleStatusMessage(message) {
        console.log(`📊 Status: ${message.message}`)
        
        if (message.status === 'auth_success') {
            this.authenticated = true
            console.log('✅ Authentication successful')
            this.startHeartbeat()
            this.subscribe()
        } else if (message.status === 'auth_failed') {
            console.error('❌ Authentication failed:', message.message)
            this.authenticated = false
        } else if (message.status === 'success' && message.message.includes('subscribed')) {
            console.log('✅ Successfully subscribed to crypto feeds')
        }
    }

    handleTradeMessage(message) {
        try {
            const symbol = this.extractSymbol(message.pair)
            const priceData = {
                symbol: symbol,
                price: parseFloat(message.p),
                timestamp: new Date(message.t)
            }

            // Update cache
            this.priceCache.set(symbol, {
                price: priceData.price,
                timestamp: priceData.timestamp,
                lastUpdated: Date.now(),
                volume: message.s || 0
            })

            // Store in database (async, don't wait)
            storePrice(priceData).catch(err => {
                console.error('❌ Error storing price:', err)
            })

            // Log significant price updates (optional)
            if (Math.random() < 0.001) { // Log 0.1% of messages to avoid spam
                console.log(`💰 ${symbol}: $${priceData.price.toFixed(6)}`)
            }

        } catch (err) {
            console.error('❌ Error handling trade message:', err)
        }
    }

    extractSymbol(pair) {
        // Convert "BTC-USD" to "BTC"
        return pair ? pair.split('-')[0] : pair
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                try {
                    this.socket.ping()
                } catch (err) {
                    console.error('❌ Error sending ping:', err)
                }
            }
        }, 30000) // Ping every 30 seconds
    }

    clearHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
    }

    clearConnectionTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout)
            this.connectionTimeout = null
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnect attempts reached. Giving up.')
            return
        }

        const delay = Math.min(
            this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        )
        
        this.reconnectAttempts++
        console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
        
        setTimeout(() => {
            console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}`)
            this.connect()
        }, delay)
    }

    getPrice(symbol) {
        const data = this.priceCache.get(symbol)
        if (!data) return null

        // Check if data is stale (older than 5 minutes)
        const now = Date.now()
        if (now - data.lastUpdated > 300000) {
            console.log(`⚠️  Stale data for ${symbol}`)
            return null
        }

        return {
            price: data.price,
            timestamp: data.timestamp,
            lastUpdated: new Date(data.lastUpdated),
            volume: data.volume || 0
        }
    }

    getAllPrices() {
        const prices = {}
        const now = Date.now()
        
        this.priceCache.forEach((value, key) => {
            // Only return fresh data (less than 5 minutes old)
            if (now - value.lastUpdated <= 300000) {
                prices[key] = {
                    ...value,
                    lastUpdated: new Date(value.lastUpdated)
                }
            }
        })
        
        return prices
    }

    getCacheStats() {
        return {
            totalSymbols: this.priceCache.size,
            connected: this.connected,
            authenticated: this.authenticated,
            activeSubscriptions: this.activeSubscriptions.size,
            reconnectAttempts: this.reconnectAttempts
        }
    }

    disconnect() {
        console.log('🔌 Manually disconnecting from Polygon.io WebSocket')
        this.clearHeartbeat()
        this.clearConnectionTimeout()
        
        if (this.socket) {
            this.socket.close(1000, 'Manual disconnect')
        }
        
        this.connected = false
        this.authenticated = false
        this.activeSubscriptions.clear()
    }
}

// Create and export instance (like your original code)
const polygonWS = new PolygonWebSocket()
module.exports = polygonWS