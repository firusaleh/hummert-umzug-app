// models/client.js
const mongoose = require('mongoose');

// Improved email validation regex that better matches RFC 5322 standard
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// Common phone number formats for European numbers
const phoneRegex = /^(\+[0-9]{1,3})?[0-9 ()-]{5,15}$/;

// Define a reusable address schema
const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  zipCode: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // German postal code validation
        return /^[0-9]{5}$/.test(v);
      },
      message: props => `${props.value} ist keine gültige Postleitzahl!`
    }
  },
  country: {
    type: String,
    trim: true,
    default: 'Deutschland'
  }
}, { _id: false });

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name ist erforderlich'],
    trim: true,
    index: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
    validate: {
      validator: function(v) {
        return !v || emailRegex.test(v);
      },
      message: props => `${props.value} ist keine gültige E-Mail-Adresse!`
    }
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || phoneRegex.test(v);
      },
      message: props => `${props.value} ist keine gültige Telefonnummer!`
    }
  },
  address: addressSchema,
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Flag to mark a client as inactive instead of deleting
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  notes: {
    type: String,
    trim: true
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

// Create a compound index for common query patterns
clientSchema.index({ createdBy: 1, createdAt: -1 });
clientSchema.index({ name: 'text' });

// Pre-save validation hook
clientSchema.pre('save', function(next) {
  // Ensure email is unique if provided
  if (this.isModified('email') && this.email) {
    this.constructor.findOne({ email: this.email, _id: { $ne: this._id } })
      .then(existingClient => {
        if (existingClient) {
          next(new Error('Diese E-Mail-Adresse wird bereits von einem anderen Kunden verwendet.'));
        } else {
          next();
        }
      })
      .catch(err => next(err));
  } else {
    next();
  }
});

// Instance method to generate a full address string
clientSchema.methods.getFullAddress = function() {
  const addr = this.address;
  if (!addr || !addr.street) return '';
  
  return `${addr.street}, ${addr.zipCode} ${addr.city}, ${addr.country}`;
};

// Static method to find clients with recent activity
clientSchema.statics.findActiveClients = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
};

// Virtual for full name (can be used if we add firstName/lastName later)
clientSchema.virtual('fullName').get(function() {
  return this.name;
});

const Client = mongoose.model('Client', clientSchema);
module.exports = Client;