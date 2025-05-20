/**
 * notification.service.js - Service for handling notifications
 * Provides methods for creating, updating, and managing notifications
 */

const Benachrichtigung = require('../models/benachrichtigung.model');
const BaseService = require('./base.service');
const { AppError } = require('../utils/error.utils');

class NotificationService extends BaseService {
  /**
   * Create a new notification
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Created notification
   */
  static async createNotification(data) {
    return await this.create(Benachrichtigung, data);
  }
  
  /**
   * Get all notifications for a user
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Notifications with pagination
   */
  static async getUserNotifications(userId, options = {}) {
    const { filter = {}, page = 1, limit = 20, showRead = false } = options;
    
    // Build filter
    const queryFilter = {
      empfaenger: userId,
      ...filter
    };
    
    // Filter by read status if specified
    if (!showRead) {
      queryFilter.gelesen = false;
    }
    
    return await this.findAll(Benachrichtigung, queryFilter, {
      populate: ['erstelltVon'],
      limit,
      skip: (page - 1) * limit,
      sort: { createdAt: -1 }
    });
  }
  
  /**
   * Get unread notifications count for a user
   * @param {String} userId - User ID
   * @returns {Promise<Number>} - Count of unread notifications
   */
  static async getUnreadCount(userId) {
    return await Benachrichtigung.countDocuments({
      empfaenger: userId,
      gelesen: false
    });
  }
  
  /**
   * Mark a notification as read
   * @param {String} notificationId - Notification ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Updated notification
   */
  static async markAsRead(notificationId, userId) {
    const notification = await this.findById(Benachrichtigung, notificationId, {
      resourceName: 'Benachrichtigung'
    });
    
    // Ensure the notification belongs to the user
    if (notification.empfaenger.toString() !== userId.toString()) {
      throw new AppError('Keine Berechtigung für diese Aktion', 403);
    }
    
    // Use the model method to mark as read
    await notification.markiereAlsGelesen();
    return notification;
  }
  
  /**
   * Mark all notifications as read for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Result with count of updated notifications
   */
  static async markAllAsRead(userId) {
    const result = await Benachrichtigung.updateMany(
      { empfaenger: userId, gelesen: false },
      { 
        gelesen: true,
        gelesenAm: new Date()
      }
    );
    
    return {
      success: true,
      count: result.modifiedCount
    };
  }
  
  /**
   * Delete a notification
   * @param {String} notificationId - Notification ID
   * @param {String} userId - User ID
   * @returns {Promise<Boolean>} - True if deleted
   */
  static async deleteNotification(notificationId, userId) {
    const notification = await this.findById(Benachrichtigung, notificationId, {
      resourceName: 'Benachrichtigung'
    });
    
    // Ensure the notification belongs to the user
    if (notification.empfaenger.toString() !== userId.toString()) {
      throw new AppError('Keine Berechtigung für diese Aktion', 403);
    }
    
    await notification.deleteOne();
    return true;
  }
  
  /**
   * Delete old read notifications
   * @param {Number} days - Age in days to consider a notification old
   * @returns {Promise<Object>} - Result with count of deleted notifications
   */
  static async deleteOldNotifications(days = 30) {
    const result = await Benachrichtigung.loescheAlte(days);
    
    return {
      success: true,
      count: result.deletedCount
    };
  }
  
  /**
   * Create a system notification for a specific user
   * @param {String} userId - User ID
   * @param {String} title - Notification title
   * @param {String} content - Notification content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Created notification
   */
  static async createSystemNotification(userId, title, content, options = {}) {
    const { type = 'info', link = null, context = null } = options;
    
    const notificationData = {
      empfaenger: userId,
      titel: title,
      inhalt: content,
      typ: type,
      linkUrl: link,
      bezug: {
        typ: 'system'
      }
    };
    
    // Add context reference if provided
    if (context && context.type && context.id) {
      notificationData.bezug = {
        typ: context.type,
        id: context.id
      };
    }
    
    return await this.create(Benachrichtigung, notificationData);
  }
  
  /**
   * Create batch notifications for multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {String} title - Notification title
   * @param {String} content - Notification content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result with count of created notifications
   */
  static async createBatchNotifications(userIds, title, content, options = {}) {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('Benutzer-IDs sind erforderlich', 400);
    }
    
    const { type = 'info', link = null, context = null } = options;
    
    const notifications = userIds.map(userId => ({
      empfaenger: userId,
      titel: title,
      inhalt: content,
      typ: type,
      linkUrl: link,
      bezug: context && context.type && context.id 
        ? { typ: context.type, id: context.id }
        : { typ: 'system' }
    }));
    
    const result = await Benachrichtigung.insertMany(notifications);
    
    return {
      success: true,
      count: result.length
    };
  }
}

module.exports = NotificationService;