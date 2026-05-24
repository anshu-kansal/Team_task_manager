const Joi = require('joi');

const signupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  mobile: Joi.string().pattern(/^[0-9+\-\s]{7,20}$/).required().messages({
    'string.pattern.base': 'Mobile number must contain only digits, spaces, plus signs, or dashes.'
  }),
  password: Joi.string().min(6).required(),
  adminCode: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required()
});

const projectSchema = Joi.object({
  title: Joi.string().min(3).max(120).required(),
  description: Joi.string().allow('').max(500).optional()
});

const memberSchema = Joi.object({
  email: Joi.string().email().required()
});

const taskSchema = Joi.object({
  title: Joi.string().min(3).max(150).required(),
  description: Joi.string().allow('').max(500).optional(),
  assigneeEmail: Joi.string().email().required(),
  dueDate: Joi.date().iso().optional(),
  status: Joi.string().valid('Todo', 'In Progress', 'Done').optional(),
  priority: Joi.string().valid('Low', 'Medium', 'High').optional()
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  projectSchema,
  memberSchema,
  taskSchema
};
