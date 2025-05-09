// controllers/taskController.js
const Task = require('../models/task');

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Serverfehler bei der Erstellung der Aufgabe'
    });
  }
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    // Hier könnten Sie Filter hinzufügen, z.B. nach Projekt oder Benutzer
    const filter = {};
    
    // Wenn ein Projekt-Filter übergeben wurde
    if (req.query.project) {
      filter.project = req.query.project;
    }
    
    // Wenn ein Status-Filter übergeben wurde
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    const tasks = await Task.find(filter)
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Serverfehler beim Abrufen der Aufgaben'
    });
  }
};

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden'
      });
    }
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error getting task by id:', error);
    res.status(500).json({
      success: false,
      error: 'Serverfehler beim Abrufen der Aufgabe'
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden'
      });
    }
    
    // Prüfen, ob der Benutzer berechtigt ist (z.B. Ersteller oder Administrator)
    // Diese Prüfung kann je nach Ihrer Berechtigungslogik angepasst werden
    
    task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
    .populate('project', 'name')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Serverfehler beim Aktualisieren der Aufgabe'
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden'
      });
    }
    
    // Prüfen, ob der Benutzer berechtigt ist (z.B. Ersteller oder Administrator)
    // Diese Prüfung kann je nach Ihrer Berechtigungslogik angepasst werden
    
    await task.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Serverfehler beim Löschen der Aufgabe'
    });
  }
};