const Joi = require('joi');

const createTaskSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Название должно содержать минимум 3 символа',
      'string.max': 'Название не должно превышать 100 символов',
      'any.required': 'Название обязательно'
    }),
  description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Описание не должно превышать 500 символов'
    }),
  category: Joi.string()
    .valid('work', 'personal', 'shopping', 'health')
    .default('personal')
    .messages({
      'any.only': 'Категория должна быть одной из: work, personal, shopping, health'
    }),
  priority: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .default(3)
    .messages({
      'number.min': 'Приоритет должен быть от 1 до 5',
      'number.max': 'Приоритет должен быть от 1 до 5'
    }),
  dueDate: Joi.date()
    .greater('now')
    .messages({
      'date.greater': 'Дата выполнения должна быть в будущем'
    })
});

const updateTaskSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(100),
  description: Joi.string()
    .max(500)
    .allow(''),
  category: Joi.string()
    .valid('work', 'personal', 'shopping', 'health'),
  priority: Joi.number()
    .integer()
    .min(1)
    .max(5),
  dueDate: Joi.date()
    .greater('now'),
  completed: Joi.boolean()
});

const validateCreateTask = (req, res, next) => {
  const { error } = createTaskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }))
    });
  }
  next();
};

const validateUpdateTask = (req, res, next) => {
  const { error } = updateTaskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }))
    });
  }
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Необходимо передать хотя бы одно поле для обновления'
    });
  }
  next();
};

const validateId = (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'ID должен быть положительным числом'
    });
  }
  req.params.id = id;
  next();
};

module.exports = {
  validateCreateTask,
  validateUpdateTask,
  validateId
};
