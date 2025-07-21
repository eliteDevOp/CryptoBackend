const express = require('express')
const router = express.Router()
const { auth, adminAuth } = require('../middlewear/auth')
const loadShedding = require('../middlewear/loadShedding')
const { getCurrentPrice, getAllPrices, getPriceHistory, searchCoin, getAllCoins, createSignal, getFullSignalDashboard, updateStatus, getRecentSignals } = require('../controllers/priceController')

router.get('/price/:symbol', getCurrentPrice)
router.get('/search', searchCoin)
router.get('/prices', getAllPrices)
router.get('/price_history/:symbol', auth, getPriceHistory)

router.get('/all-coins', getAllCoins)
router.post('/create-signal', createSignal)
router.get('/signal-dashboard', getFullSignalDashboard)
router.get('/recent-signals', getRecentSignals)
router.post('/update', updateStatus)

module.exports = router
