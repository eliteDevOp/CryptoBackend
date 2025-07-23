const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const errorHandler = require('./middlewear/errorHandler')
const polygonWS = require('./websocket/polygonWS')
const apiRoutes = require('./routes/api')

const app = express()

// Middleware

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Routes
app.use('/api', apiRoutes)

// Error handler
app.use(errorHandler)

// Initialize WebSocket connection
polygonWS.connect()

module.exports = app
