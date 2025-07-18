const Joi = require('joi')

const userSchema = Joi.object({
	username: Joi.string().alphanum().min(3).max(30).required(),
	email: Joi.string().email().required(),
	password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{8,30}$')).required(),
	isAdmin: Joi.boolean().default(false)
})

const loginSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().required()
})

const priceSchema = Joi.object({
	symbol: Joi.string().pattern(new RegExp('^[A-Z0-9]{3,10}$')).required(),
	price: Joi.number().positive().required(),
	timestamp: Joi.date().iso().required()
})

module.exports = {
	validateUser: (data) => userSchema.validate(data),
	validateLogin: (data) => loginSchema.validate(data),
	validatePrice: (data) => priceSchema.validate(data)
}
