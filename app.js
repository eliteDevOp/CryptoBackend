const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const polygonWS = require('./services/polygon/PolygonWebSocket')
const apiRoutes = require('./routes/api')

const app = express()

// Middleware

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Routes
app.use('/api', apiRoutes)

// Initialize WebSocket connection
polygonWS.connect()

module.exports = app
