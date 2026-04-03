const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  selectedColor: {
    type: String
  },
  selectedSize: {
    type: String
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: true
  },
  lineTotal: {
    type: Number,
    required: true
  },
  image: {
    type: String
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerFullName: {
    type: String,
    required: [true, 'Customer full name is required']
  },
  customerPhone: {
    type: String,
    required: [true, 'Customer phone is required']
  },
  customerEmail: {
    type: String
  },
  deliveryRegion: {
    type: String
  },
  deliveryAddress: {
    type: String
  },
  orderItems: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'GHS'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['new', 'processing', 'ready_for_pickup', 'completed', 'cancelled'],
    default: 'new'
  },
  paymentReference: {
    type: String,
    unique: true,
    sparse: true
  },
  paystackTransactionId: {
    type: String
  },
  paymentChannel: {
    type: String
  },
  paidAt: {
    type: Date
  },
  customerNote: {
    type: String
  },
  internalNote: {
    type: String
  },
  pickupNoticeAcknowledged: {
    type: Boolean,
    default: false
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ paymentReference: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customerFullName': 'text', 'customerPhone': 'text', 'orderNumber': 'text' });

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Order').countDocuments() + 1;
    this.orderNumber = `LV-${year}-${String(count).padStart(6, '0')}`;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;