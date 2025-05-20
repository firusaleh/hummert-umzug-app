// models/project.js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name ist erforderlich'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Kunde ist erforderlich'],
    index: true
  },
  startDate: {
    type: Date,
    required: [true, 'Startdatum ist erforderlich'],
    validate: {
      validator: function(v) {
        return v instanceof Date && !isNaN(v);
      },
      message: 'Ungültiges Startdatum'
    },
    index: true
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || (v instanceof Date && !isNaN(v));
      },
      message: 'Ungültiges Enddatum'
    },
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ['geplant', 'in Bearbeitung', 'pausiert', 'abgeschlossen'],
      message: '{VALUE} ist kein gültiger Status'
    },
    default: 'geplant',
    index: true
  },
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  team: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  budget: {
    planned: {
      type: Number,
      default: 0,
      min: [0, 'Budget kann nicht negativ sein']
    },
    actual: {
      type: Number,
      default: 0
    }
  },
  priority: {
    type: String,
    enum: {
      values: ['niedrig', 'mittel', 'hoch', 'kritisch'],
      message: '{VALUE} ist keine gültige Priorität'
    },
    default: 'mittel'
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Flag to mark a project as inactive instead of deleting
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
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
projectSchema.index({ client: 1, status: 1 });
projectSchema.index({ startDate: 1, endDate: 1 });
projectSchema.index({ createdBy: 1, createdAt: -1 });
projectSchema.index({ name: 'text', description: 'text' });

// Pre-save validation hook
projectSchema.pre('save', function(next) {
  // Validate date range
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    return next(new Error('Startdatum muss vor Enddatum liegen'));
  }
  
  // Ensure dates are valid Date objects
  if (this.startDate && !(this.startDate instanceof Date)) {
    try {
      this.startDate = new Date(this.startDate);
    } catch (err) {
      return next(new Error('Ungültiges Startdatum-Format'));
    }
  }
  
  if (this.endDate && !(this.endDate instanceof Date)) {
    try {
      this.endDate = new Date(this.endDate);
    } catch (err) {
      return next(new Error('Ungültiges Enddatum-Format'));
    }
  }
  
  next();
});

// Add pre-validate hook to ensure client exists
projectSchema.pre('validate', async function(next) {
  if (this.isNew && this.client) {
    try {
      const Client = mongoose.model('Client');
      const clientExists = await Client.exists({ _id: this.client });
      if (!clientExists) {
        return next(new Error('Der angegebene Kunde existiert nicht'));
      }
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// Virtual for project duration in days
projectSchema.virtual('durationDays').get(function() {
  if (!this.startDate || !this.endDate) return null;
  
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for project progress based on task status
projectSchema.virtual('progress').get(function() {
  if (!this.tasks || this.tasks.length === 0) return 0;
  return Math.round((this.tasks.filter(task => task.status === 'abgeschlossen').length / this.tasks.length) * 100);
});

// Static method to find active projects
projectSchema.statics.findActiveProjects = function(limit = 10) {
  return this.find({ isActive: true, status: { $ne: 'abgeschlossen' } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to find projects by date range
projectSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { $and: [
        { startDate: { $lte: startDate } },
        { endDate: { $gte: endDate } }
      ]}
    ]
  }).lean();
};

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;