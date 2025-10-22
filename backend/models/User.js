const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Employee', 'Manager', 'Higher_Management', 'Admin'],
    default: 'Employee',
  },
  team: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ userId: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);

