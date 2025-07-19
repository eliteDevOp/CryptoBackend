const winston = require('winston')
const { combine, timestamp, printf, colorize } = winston.format

const logFormat = printf(({ level, message, timestamp }) => {
	return `${timestamp} [${level}]: ${message}`
})

const logger = winston.createLogger({
	level:  'debug',
	format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
	transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'logs/error.log', level: 'error' }), new winston.transports.File({ filename: 'logs/combined.log' })],
	exceptionHandlers: [new winston.transports.File({ filename: 'logs/exceptions.log' })]
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (ex) => {
	throw ex
})

module.exports = logger
