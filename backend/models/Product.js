const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  product_name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Brand cannot exceed 100 characters'],
    default: ''
  },
  short_description: {
    type: String,
    required: [true, 'Short description is required'],
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  original_price: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Original price must be a positive number']
  },
  sales_price: {
    type: Number,
    required: [true, 'Sales price is required'],
    min: [0, 'Sales price must be a positive number']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Shoes',
      'Bags',
      'T-Shirts',
      'Dresses',
      'Jeans',
      'Underwear',
      'Wigs',
      'Hair Bundles',
      'Hair Extensions',
      'Hair Products & Tools',
      'Belts'
    ]
  },
  subcategory: {
    type: String,
    enum: [
      'Heels',
      'Slipper Heels',
      'Flat Slippers',
      'Flat Sandals',
      'Block Sandals',
      'Block Slippers',
      'Flat Shoes',
      'Unisex Slippers',
      'Sneakers',
      "Men's Executive Shoes",
      "Men's Slippers",
      "Men's Sandals",
      'Kids Shoes (Girls)',
      'Kids Shoes (Boys)',
      'Kids Shoes (Unisex)',
      ''
    ],
    default: ''
  },
  sizes: [{
    type: String,
    trim: true
  }],
  colors: [{
    type: String,
    trim: true
  }],
  dimensions_in_inches: {
    type: String,
    default: ''
  },
  stock_quantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock quantity must be a positive number'],
    default: 0
  },
  cover_image: {
    type: String,
    required: [true, 'Cover image is required']
  },
  additional_images: [{
    type: String
  }],
  featured_product: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for category filtering
productSchema.index({ category: 1 });

// Index for featured products
productSchema.index({ featured_product: 1 });

// Index for search
productSchema.index({ product_name: 'text', brand: 'text', short_description: 'text' });

// Validate that sales price doesn't exceed original price
productSchema.pre('save', function(next) {
  if (this.sales_price > this.original_price) {
    const error = new Error('Sales price cannot exceed original price');
    error.name = 'ValidationError';
    next(error);
  } else {
    next();
  }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
