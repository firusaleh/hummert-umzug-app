// models/task.js
const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: true });

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Titel ist erforderlich'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Projekt ist erforderlich'],
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ['offen', 'in Bearbeitung', 'Review', 'abgeschlossen'],
      message: '{VALUE} ist kein gültiger Status'
    },
    default: 'offen',
    index: true
  },
  priority: {
    type: String,
    enum: {
      values: ['niedrig', 'mittel', 'hoch', 'kritisch'],
      message: '{VALUE} ist keine gültige Priorität'
    },
    default: 'mittel',
    index: true
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || (v instanceof Date && !isNaN(v));
      },
      message: 'Ungültiges Fälligkeitsdatum'
    },
    index: true
  },
  completedAt: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Geschätzte Stunden können nicht negativ sein']
  },
  actualHours: {
    type: Number,
    default: 0,
    min: [0, 'Tatsächliche Stunden können nicht negativ sein']
  },
  attachments: [attachmentSchema],
  comments: [commentSchema],
  tags: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Flag to mark a task as active
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  dependsOn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }]
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Create compound indexes for common query patterns
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ title: 'text', description: 'text' });

// Pre-save middleware for task completion
taskSchema.pre('save', function(next) {
  // Automatically set completedAt when status changes to 'abgeschlossen'
  if (this.isModified('status') && this.status === 'abgeschlossen' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Reset completedAt if task is reopened
  if (this.isModified('status') && this.status !== 'abgeschlossen' && this.completedAt) {
    this.completedAt = null;
  }
  
  // Ensure dates are valid
  if (this.dueDate && !(this.dueDate instanceof Date)) {
    try {
      this.dueDate = new Date(this.dueDate);
    } catch (err) {
      return next(new Error('Ungültiges Fälligkeitsdatum-Format'));
    }
  }
  
  next();
});

// Add pre-validate hook to ensure project exists
taskSchema.pre('validate', async function(next) {
  if (this.isNew && this.project) {
    try {
      const Project = mongoose.model('Project');
      const projectExists = await Project.exists({ _id: this.project });
      if (!projectExists) {
        return next(new Error('Das angegebene Projekt existiert nicht'));
      }
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// Virtual for task completion status
taskSchema.virtual('isCompleted').get(function() {
  return this.status === 'abgeschlossen';
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate) return false;
  if (this.status === 'abgeschlossen') return false;
  
  return new Date() > this.dueDate;
});

// Virtual for remaining time (in days)
taskSchema.virtual('remainingDays').get(function() {
  if (!this.dueDate || this.status === 'abgeschlossen') return null;
  
  const today = new Date();
  const diffTime = this.dueDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static method to find overdue tasks
taskSchema.statics.findOverdueTasks = function() {
  const today = new Date();
  return this.find({
    dueDate: { $lt: today },
    status: { $ne: 'abgeschlossen' },
    isActive: true
  })
  .sort({ dueDate: 1 })
  .lean();
};

// Static method to find tasks due soon
taskSchema.statics.findTasksDueSoon = function(days = 3) {
  const today = new Date();
  const soon = new Date();
  soon.setDate(today.getDate() + days);
  
  return this.find({
    dueDate: { $gte: today, $lte: soon },
    status: { $ne: 'abgeschlossen' },
    isActive: true
  })
  .sort({ dueDate: 1 })
  .lean();
};

// Instance method to add a comment
taskSchema.methods.addComment = async function(text, userId) {
  this.comments.push({
    text,
    createdBy: userId,
    createdAt: new Date()
  });
  
  return this.save();
};

// Ensure we don't create duplicate model
const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
module.exports = Task;