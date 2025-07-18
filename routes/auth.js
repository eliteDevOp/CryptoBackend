const express = require('express')
const router = express.Router()
const { startRegistrationFunc, completeRegistrationFunc, login } = require('../controllers/authController')

router.post('/register/start', startRegistrationFunc)
router.post('/register/complete', completeRegistrationFunc)
router.post('/login', login)

module.exports = router
