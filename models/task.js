// models/task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['offen', 'in Bearbeitung', 'Review', 'abgeschlossen'],
    default: 'offen'
  },
  priority: {
    type: String,
    enum: ['niedrig', 'mittel', 'hoch', 'kritisch'],
    default: 'mittel'
  },
  dueDate: {
    type: Date
  },
  attachments: [{
    fileName: String,
    filePath: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Verhindert den OverwriteModelError durch Prüfung, ob das Modell bereits existiert
module.exports = mongoose.models.Task || mongoose.model('Task', taskSchema);