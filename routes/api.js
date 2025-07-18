const express = require("express")
const router = express.Router()
const { auth, adminAuth } = require("../middlewear/auth")
const loadShedding = require("../middlewear/loadShedding")
const { getCurrentPrice, getAllPrices, getPriceHistory, searchCoin, getAllCoins, getTopPerformingCoins, createSignal } = require("../controllers/priceController")

router.get("/price/:symbol", getCurrentPrice)
router.get("/search", searchCoin)
router.get("/prices", getAllPrices)
router.get("/price-history/:symbol", auth, getPriceHistory)

// New routes
router.get("/all-coins", getAllCoins)
router.get("/top-coins", getTopPerformingCoins)
router.post("/create-signal", auth, createSignal)

module.exports = router
