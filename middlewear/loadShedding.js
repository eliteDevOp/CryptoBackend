module.exports = (req, res, next) => {
	const memoryUsage = process.memoryUsage().rss / 1024 / 1024 

	if (memoryUsage > 3500) {
		return res.status(503).json({
			error: 'Server under heavy load',
			action: 'Try again in 30 seconds'
		})
	}
	next()
}
