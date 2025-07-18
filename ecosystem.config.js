module.exports = {
	apps: [
		{
			name: 'crypto-signals',
			script: 'server.js',
			instances: 1,
			max_memory_restart: '1.5G',
			env_production: {
				NODE_ENV: 'production'
			}
		}
	]
}
