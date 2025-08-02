const express = require('express')
const router = express.Router()
const { getMarketStats } = require('../controllers/priceController')

router.get('/all-coins', getMarketStats)

module.exports = router
