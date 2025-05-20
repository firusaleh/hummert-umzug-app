/**
 * task.service.js - Service layer for task operations
 * Provides business logic for task management
 */

const Task = require('../models/task');
const Project = require('../models/project');
const User = require('../models/user');
const BaseService = require('./base.service');
const NotificationService = require('./notification.service');
const { AppError } = require('../utils/error.utils');

class TaskService extends BaseService {
  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @param {String} userId - User creating the task
   * @returns {Promise<Object>} - Created task
   */
  static async createTask(taskData, userId) {
    // Validate project exists
    await this.validateProject(taskData.project);
    
    // Check if assignee exists
    if (taskData.assignedTo) {
      await this.validateAssignee(taskData.assignedTo);
    }
    
    // Create task with user as creator
    const task = await this.create(Task, {
      ...taskData,
      createdBy: userId
    }, {
      populate: [
        { path: 'project', select: 'name' },
        { path: 'assignedTo', select: 'name email' },
        { path: 'createdBy', select: 'name email' }
      ]
    });
    
    // Send notification to assignee if assigned
    if (task.assignedTo) {
      try {
        await NotificationService.createNotification({
          empfaenger: task.assignedTo._id,
          titel: 'Neue Aufgabe zugewiesen',
          inhalt: `Ihnen wurde eine neue Aufgabe zugewiesen: ${task.title}`,
          typ: 'info',
          linkUrl: `/tasks/${task._id}`,
          bezug: {
            typ: 'task',
            id: task._id
          },
          erstelltVon: userId
        });
      } catch (err) {
        console.error('Error sending task notification:', err);
        // Don't fail the task creation if notification fails
      }
    }
    
    return task;
  }
  
  /**
   * Get all tasks with filtering
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Tasks with pagination
   */
  static async getTasks(filter = {}, options = {}) {
    // Prepare filter
    const queryFilter = { ...filter };
    
    // Text search if provided
    if (filter.search) {
      queryFilter.$text = { $search: filter.search };
      delete queryFilter.search;
    }
    
    // Status filter
    if (filter.status && filter.status !== 'alle') {
      queryFilter.status = filter.status;
    } else {
      delete queryFilter.status;
    }
    
    // Due date range filter
    if (filter.dueStartDate || filter.dueEndDate) {
      queryFilter.dueDate = {};
      if (filter.dueStartDate) {
        queryFilter.dueDate.$gte = new Date(filter.dueStartDate);
      }
      if (filter.dueEndDate) {
        queryFilter.dueDate.$lte = new Date(filter.dueEndDate);
      }
      delete queryFilter.dueStartDate;
      delete queryFilter.dueEndDate;
    }
    
    // Priority filter
    if (filter.priority && filter.priority !== 'alle') {
      queryFilter.priority = filter.priority;
    } else {
      delete queryFilter.priority;
    }
    
    // Default to active tasks only unless specifically requesting inactive
    if (filter.showInactive !== 'true' && filter.isActive !== false) {
      queryFilter.isActive = true;
    }
    delete queryFilter.showInactive;
    
    // Set up default options
    const queryOptions = {
      populate: [
        { path: 'project', select: 'name' },
        { path: 'assignedTo', select: 'name email' },
        { path: 'createdBy', select: 'name email' }
      ],
      sort: options.sort || { createdAt: -1 },
      ...options
    };
    
    return await this.findAll(Task, queryFilter, queryOptions);
  }
  
  /**
   * Get a task by ID
   * @param {String} id - Task ID
   * @returns {Promise<Object>} - Task details
   */
  static async getTaskById(id) {
    return await this.findById(Task, id, {
      populate: [
        { path: 'project', select: 'name client' },
        { path: 'assignedTo', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
        { path: 'comments.createdBy', select: 'name email' },
        { path: 'attachments.uploadedBy', select: 'name email' },
        { path: 'dependsOn', select: 'title status' }
      ],
      resourceName: 'Aufgabe'
    });
  }
  
  /**
   * Update a task
   * @param {String} id - Task ID
   * @param {Object} updateData - Task update data
   * @param {String} userId - User performing the update
   * @returns {Promise<Object>} - Updated task
   */
  static async updateTask(id, updateData, userId) {
    // Get the current task to check for status change
    const currentTask = await this.findById(Task, id, {
      resourceName: 'Aufgabe'
    });
    
    // Check if assignee is changing
    let assigneeChanged = false;
    if (updateData.assignedTo && 
        updateData.assignedTo.toString() !== (currentTask.assignedTo?.toString() || null)) {
      await this.validateAssignee(updateData.assignedTo);
      assigneeChanged = true;
    }
    
    // Check if project is changing
    if (updateData.project && 
        updateData.project.toString() !== currentTask.project.toString()) {
      await this.validateProject(updateData.project);
    }
    
    // Update the task
    const task = await this.update(Task, id, updateData, {
      populate: [
        { path: 'project', select: 'name' },
        { path: 'assignedTo', select: 'name email' },
        { path: 'createdBy', select: 'name email' }
      ],
      resourceName: 'Aufgabe'
    });
    
    // Send notification for status change
    if (updateData.status && updateData.status !== currentTask.status) {
      try {
        // Notify task creator if different from updater
        if (currentTask.createdBy.toString() !== userId) {
          await NotificationService.createNotification({
            empfaenger: currentTask.createdBy,
            titel: 'Aufgabenstatus geändert',
            inhalt: `Der Status der Aufgabe "${task.title}" wurde auf "${task.status}" geändert.`,
            typ: 'info',
            linkUrl: `/tasks/${task._id}`,
            bezug: {
              typ: 'task',
              id: task._id
            },
            erstelltVon: userId
          });
        }
        
        // Additional notification for completed tasks
        if (updateData.status === 'abgeschlossen') {
          // Notify assignee if different from updater
          if (currentTask.assignedTo && 
              currentTask.assignedTo.toString() !== userId) {
            await NotificationService.createNotification({
              empfaenger: currentTask.assignedTo,
              titel: 'Aufgabe abgeschlossen',
              inhalt: `Die Aufgabe "${task.title}" wurde als abgeschlossen markiert.`,
              typ: 'erfolg',
              linkUrl: `/tasks/${task._id}`,
              bezug: {
                typ: 'task',
                id: task._id
              },
              erstelltVon: userId
            });
          }
        }
      } catch (err) {
        console.error('Error sending task status notification:', err);
      }
    }
    
    // Send notification for assignee change
    if (assigneeChanged && task.assignedTo) {
      try {
        await NotificationService.createNotification({
          empfaenger: task.assignedTo._id,
          titel: 'Aufgabe zugewiesen',
          inhalt: `Ihnen wurde die Aufgabe "${task.title}" zugewiesen.`,
          typ: 'info',
          linkUrl: `/tasks/${task._id}`,
          bezug: {
            typ: 'task',
            id: task._id
          },
          erstelltVon: userId
        });
      } catch (err) {
        console.error('Error sending assignee notification:', err);
      }
    }
    
    return task;
  }
  
  /**
   * Delete a task
   * @param {String} id - Task ID
   * @returns {Promise<Boolean>} - True if task was deleted
   */
  static async deleteTask(id) {
    return await this.delete(Task, id, {
      resourceName: 'Aufgabe'
    });
  }
  
  /**
   * Add a comment to a task
   * @param {String} taskId - Task ID
   * @param {String} comment - Comment text
   * @param {String} userId - User adding the comment
   * @returns {Promise<Object>} - Updated task with new comment
   */
  static async addComment(taskId, comment, userId) {
    const task = await this.findById(Task, taskId, {
      resourceName: 'Aufgabe'
    });
    
    await task.addComment(comment, userId);
    
    // Notify task assignee and creator about the new comment
    try {
      // Create a list of users to notify (excluding commenter)
      const usersToNotify = [];
      
      // Add assignee if they didn't add the comment
      if (task.assignedTo && task.assignedTo.toString() !== userId) {
        usersToNotify.push(task.assignedTo);
      }
      
      // Add creator if they didn't add the comment
      if (task.createdBy.toString() !== userId) {
        usersToNotify.push(task.createdBy);
      }
      
      // Send notifications
      for (const recipientId of usersToNotify) {
        await NotificationService.createNotification({
          empfaenger: recipientId,
          titel: 'Neuer Kommentar zu einer Aufgabe',
          inhalt: `Ein neuer Kommentar wurde zur Aufgabe "${task.title}" hinzugefügt.`,
          typ: 'info',
          linkUrl: `/tasks/${task._id}`,
          bezug: {
            typ: 'task',
            id: task._id
          },
          erstelltVon: userId
        });
      }
    } catch (err) {
      console.error('Error sending comment notification:', err);
    }
    
    return this.findById(Task, taskId, {
      populate: [
        { path: 'project', select: 'name' },
        { path: 'assignedTo', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
        { path: 'comments.createdBy', select: 'name email' }
      ],
      resourceName: 'Aufgabe'
    });
  }
  
  /**
   * Add an attachment to a task
   * @param {String} taskId - Task ID
   * @param {Object} attachment - Attachment data
   * @param {String} userId - User adding the attachment
   * @returns {Promise<Object>} - Updated task with new attachment
   */
  static async addAttachment(taskId, attachment, userId) {
    const task = await this.findById(Task, taskId, {
      resourceName: 'Aufgabe'
    });
    
    task.attachments.push({
      ...attachment,
      uploadedBy: userId,
      uploadedAt: new Date()
    });
    
    await task.save();
    
    return this.findById(Task, taskId, {
      populate: [
        { path: 'project', select: 'name' },
        { path: 'assignedTo', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
        { path: 'attachments.uploadedBy', select: 'name email' }
      ],
      resourceName: 'Aufgabe'
    });
  }
  
  /**
   * Get overdue tasks
   * @returns {Promise<Array>} - List of overdue tasks
   */
  static async getOverdueTasks() {
    return await Task.findOverdueTasks();
  }
  
  /**
   * Get tasks due soon
   * @param {Number} days - Days threshold
   * @returns {Promise<Array>} - List of tasks due soon
   */
  static async getTasksDueSoon(days = 3) {
    return await Task.findTasksDueSoon(days);
  }
  
  /**
   * Get task statistics
   * @returns {Promise<Object>} - Task statistics
   */
  static async getTaskStats() {
    // Count tasks by status
    const statusStats = await Task.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Count tasks by priority
    const priorityStats = await Task.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    // Count tasks by assignee
    const assigneeStats = await Task.aggregate([
      { $match: { isActive: true, assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);
    
    // Get assignee names
    const assigneeIds = assigneeStats.map(stat => stat._id);
    const assignees = await User.find({ _id: { $in: assigneeIds } })
      .select('name email');
    
    const assigneeMap = {};
    assignees.forEach(assignee => {
      assigneeMap[assignee._id] = assignee;
    });
    
    const assigneeStatsWithNames = assigneeStats.map(stat => ({
      _id: stat._id,
      count: stat.count,
      assignee: assigneeMap[stat._id]
    }));
    
    // Count overdue tasks
    const overdueTasks = await this.getOverdueTasks();
    
    // Count tasks due soon
    const tasksDueSoon = await this.getTasksDueSoon();
    
    return {
      statusStats,
      priorityStats,
      assigneeStats: assigneeStatsWithNames,
      overdueCount: overdueTasks.length,
      dueSoonCount: tasksDueSoon.length
    };
  }
  
  /**
   * Validate that a project exists
   * @param {String} projectId - Project ID
   * @throws {AppError} - If project doesn't exist
   */
  static async validateProject(projectId) {
    const projectExists = await this.exists(Project, { _id: projectId });
    if (!projectExists) {
      throw new AppError('Das angegebene Projekt existiert nicht', 400);
    }
  }
  
  /**
   * Validate that a user exists and can be assigned
   * @param {String} userId - User ID
   * @throws {AppError} - If user doesn't exist or is inactive
   */
  static async validateAssignee(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Der angegebene Benutzer existiert nicht', 400);
    }
    
    if (!user.isActive) {
      throw new AppError('Der angegebene Benutzer ist nicht aktiv', 400);
    }
  }
}

module.exports = TaskService;