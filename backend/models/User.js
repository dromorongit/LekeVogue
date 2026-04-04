const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,4})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['super_admin', 'order_manager'],
    default: 'order_manager'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  processedOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }]
}, {
  timestamps: true
});



// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check permission method
userSchema.methods.hasPermission = function(permission) {
  const permissions = {
    super_admin: [
      'view_dashboard',
      'view_orders',
      'view_single_order',
      'manage_products',
      'manage_orders',
      'create_users',
      'edit_users',
      'deactivate_users',
      'view_reports',
      'manage_settings'
    ],
    order_manager: [
      'view_orders',
      'view_single_order',
      'update_order_status',
      'add_internal_order_note'
    ]
  };
  
  return permissions[this.role]?.includes(permission) || false;
};

const User = mongoose.model('User', userSchema);

module.exports = User;