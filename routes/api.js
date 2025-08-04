const express = require('express')
const router = express.Router()
const { getMarketStats, getCoinPrice } = require('../controllers/priceController')

router.get('/all-coins', getMarketStats)
router.get('/coin-price', getCoinPrice)

module.exports = router
