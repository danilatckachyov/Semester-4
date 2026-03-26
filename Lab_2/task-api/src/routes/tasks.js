const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { 
  validateCreateTask, 
  validateUpdateTask, 
  validateId 
} = require('../middleware/validation');
const { 
  initializeDataFile, 
  readData, 
  writeData, 
  getNextId 
} = require('../utils/fileOperations');

initializeDataFile();

// GET /api/tasks - получение всех задач с фильтрацией, сортировкой, пагинацией
router.get('/', async (req, res, next) => {
  try {
    const { category, completed, priority, sortBy, page = 1, limit = 100 } = req.query;
    const data = await readData();
    let tasks = [...data.tasks];
    if (category) tasks = tasks.filter(t => t.category === category);
    if (completed !== undefined) tasks = tasks.filter(t => String(t.completed) === String(completed));
    if (priority) tasks = tasks.filter(t => t.priority === Number(priority));
    if (sortBy) {
      let field = sortBy.replace('-', '');
      let desc = sortBy.startsWith('-');
      tasks.sort((a, b) => {
        if (!a[field] || !b[field]) return 0;
        if (desc) return a[field] < b[field] ? 1 : -1;
        return a[field] > b[field] ? 1 : -1;
      });
    }
    // Пагинация
    const start = (page - 1) * limit;
    const end = start + Number(limit);
    const paged = tasks.slice(start, end);
    res.json({
      success: true,
      count: paged.length,
      data: paged
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id - получение задачи по ID
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const data = await readData();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' });
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks - создание новой задачи
router.post('/', validateCreateTask, async (req, res, next) => {
  try {
    const { title, description, category, priority, dueDate } = req.body;
    const data = await readData();
    const newTask = {
      id: await getNextId(),
      uuid: uuidv4(),
      title,
      description: description || '',
      category: category || 'personal',
      priority: priority || 3,
      dueDate: dueDate || null,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.tasks.push(newTask);
    await writeData(data);
    res.status(201).json({
      success: true,
      message: 'Задача успешно создана',
      data: newTask
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id - полное обновление задачи
router.put('/:id', validateId, validateUpdateTask, async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const updates = req.body;
    const data = await readData();
    const idx = data.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Задача не найдена' });
    const updatedTask = { ...data.tasks[idx], ...updates, updatedAt: new Date().toISOString() };
    data.tasks[idx] = updatedTask;
    await writeData(data);
    res.json({ success: true, message: 'Задача успешно обновлена', data: updatedTask });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id/complete - отметка задачи как выполненной
router.patch('/:id/complete', validateId, async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const data = await readData();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' });
    task.completed = true;
    task.updatedAt = new Date().toISOString();
    await writeData(data);
    res.json({ success: true, message: 'Задача отмечена как выполненная', data: task });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - удаление задачи
router.delete('/:id', validateId, async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const data = await readData();
    const idx = data.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Задача не найдена' });
    data.tasks.splice(idx, 1);
    await writeData(data);
    res.json({ success: true, message: 'Задача успешно удалена' });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/stats/summary - статистика по задачам
router.get('/stats/summary', async (req, res, next) => {
  try {
    const data = await readData();
    const tasks = data.tasks;
    const stats = {
      total: tasks.length,
      completed: 0,
      pending: 0,
      overdue: 0,
      byCategory: {},
      byPriority: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
    const today = new Date();
    for (const t of tasks) {
      if (t.completed) stats.completed++;
      else stats.pending++;
      if (t.dueDate && !t.completed && new Date(t.dueDate) < today) stats.overdue++;
      stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + 1;
      stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;
    }
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/search/text - поиск задач
router.get('/search/text', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Поисковый запрос должен содержать минимум 2 символа'
      });
    }
    const data = await readData();
    const searchTerm = q.toLowerCase().trim();
    const results = data.tasks.filter(t =>
      (t.title && t.title.toLowerCase().includes(searchTerm)) ||
      (t.description && t.description.toLowerCase().includes(searchTerm))
    );
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
