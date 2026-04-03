const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { 
  uploadCoverImage, 
  uploadAdditionalImages, 
  deleteImage 
} = require('../config/cloudinary');

// @route   POST /api/products
// @desc    Create a new product
// @access  Protected
router.post('/', protect, uploadCoverImage, async (req, res) => {
  try {
    const {
      product_name,
      brand,
      short_description,
      original_price,
      sales_price,
      category,
      sizes,
      colors,
      color_sizes,
      dimensions_in_inches,
      stock_quantity,
      featured_product
    } = req.body;

    // Validation: Only original_price is required
    if (!original_price) {
      return res.status(400).json({
        success: false,
        message: 'Original price is required'
      });
    }

    // Validation: Sales price cannot exceed original price (only if both are provided)
    if (sales_price && original_price && parseFloat(sales_price) > parseFloat(original_price)) {
      return res.status(400).json({
        success: false,
        message: 'Sales price cannot exceed original price'
      });
    }

    // Validation: Stock quantity must be positive
    if (parseInt(stock_quantity) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock quantity must be a positive number'
      });
    }

    // Cover image is now optional - allow products without cover image
    // The cover image URL will be set to a placeholder or empty string
    let coverImageUrl = '';
    if (req.file && req.file.path) {
      coverImageUrl = req.file.path;
    } else {
      // Use a default placeholder image
      coverImageUrl = 'https://via.placeholder.com/400x400?text=No+Image';
    }

    // Cover image URL is already set above (with placeholder if not uploaded)

    // Get additional images URLs
    const additionalImages = req.files ? req.files.map(file => file.path) : [];

    // Parse sizes and colors from comma-separated strings to arrays
    const sizesArray = sizes ? sizes.split(',').map(s => s.trim()).filter(s => s) : [];
    const colorsArray = colors ? colors.split(',').map(c => c.trim()).filter(c => c) : [];
    
    // Parse color_sizes from JSON string
    let colorSizesObj = {};
    try {
      if (color_sizes) {
        colorSizesObj = typeof color_sizes === 'string' ? JSON.parse(color_sizes) : color_sizes;
      }
    } catch (e) {
      console.error('Error parsing color_sizes:', e);
    }

    // Parse size_stock from JSON string
    let sizeStockObj = {};
    try {
      if (size_stock) {
        sizeStockObj = typeof size_stock === 'string' ? JSON.parse(size_stock) : size_stock;
      }
    } catch (e) {
      console.error('Error parsing size_stock:', e);
    }

    const product = new Product({
      product_name,
      brand: brand || '',
      short_description,
      original_price: parseFloat(original_price) || 0,
      sales_price: sales_price ? parseFloat(sales_price) : null,
      category,
      sizes: sizesArray,
      colors: colorsArray,
      color_sizes: colorSizesObj,
      size_stock: sizeStockObj,
      dimensions_in_inches: dimensions_in_inches || '',
      stock_quantity: parseInt(stock_quantity) || 0,
      cover_image: coverImageUrl,
      additional_images: additionalImages,
      featured_product: featured_product === 'true' || featured_product === true
    });

    const createdProduct = await product.save();

    res.status(201).json({
      success: true,
      data: createdProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating product'
    });
  }
});

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, sort, limit = 50, page = 1 } = req.query;

    // Build query
    let query = {};

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by featured
    if (featured === 'true') {
      query.featured_product = true;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { product_name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { short_description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    let sortOption = { createdAt: -1 }; // Default: newest first
    if (sort === 'price_asc') {
      sortOption = { sales_price: 1 };
    } else if (sort === 'price_desc') {
      sortOption = { sales_price: -1 };
    } else if (sort === 'name_asc') {
      sortOption = { product_name: 1 };
    } else if (sort === 'name_desc') {
      sortOption = { product_name: -1 };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .sort(sortOption)
      .limit(limitNum)
      .skip(skip);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
});

// @route   GET /api/products/stats
// @desc    Get product statistics
// @access  Protected
router.get('/stats', protect, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const featuredProducts = await Product.countDocuments({ featured_product: true });
    const lowStockItems = await Product.countDocuments({ stock_quantity: { $lt: 10 } });
    const outOfStock = await Product.countDocuments({ stock_quantity: 0 });

    // Category breakdown
    const categoryBreakdown = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        featuredProducts,
        lowStockItems,
        outOfStock,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate if id is a valid MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product'
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Protected
router.put('/:id', protect, uploadCoverImage, async (req, res) => {
  try {
    const {
      product_name,
      brand,
      short_description,
      original_price,
      sales_price,
      category,
      sizes,
      colors,
      color_sizes,
      dimensions_in_inches,
      stock_quantity,
      featured_product,
      existing_cover_image,
      existing_additional_images
    } = req.body;

    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validation: Sales price cannot exceed original price
    const newOriginalPrice = parseFloat(original_price) || product.original_price;
    // Only update sales_price if explicitly provided, otherwise keep existing value
    const newSalesPrice = sales_price ? parseFloat(sales_price) : (product.sales_price || null);
    
    if (newSalesPrice && newOriginalPrice && newSalesPrice > newOriginalPrice) {
      return res.status(400).json({
        success: false,
        message: 'Sales price cannot exceed original price'
      });
    }

    // Validation: Stock quantity must be positive
    if (stock_quantity !== undefined && parseInt(stock_quantity) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock quantity must be a positive number'
      });
    }

    // Handle cover image update - use new uploaded image if available, otherwise use existing
    let coverImageUrl = product.cover_image;
    if (req.file && req.file.path) {
      // New image was uploaded, use the new URL
      coverImageUrl = req.file.path;
      
      // Optionally delete the old image from Cloudinary
      if (product.cover_image) {
        await deleteImage(product.cover_image);
      }
    } else if (existing_cover_image) {
      // Use explicitly provided existing cover image URL
      coverImageUrl = existing_cover_image;
    }

    // Handle additional images update
    let additionalImages = product.additional_images;
    if (existing_additional_images) {
      // Parse existing images from JSON string
      additionalImages = JSON.parse(existing_additional_images);
    }

    // Parse sizes and colors from comma-separated strings to arrays
    const sizesArray = sizes ? sizes.split(',').map(s => s.trim()).filter(s => s) : product.sizes;
    const colorsArray = colors ? colors.split(',').map(c => c.trim()).filter(c => c) : product.colors;

    // Parse color_sizes from JSON string
    let colorSizesObj = product.color_sizes || {};
    try {
      if (color_sizes) {
        colorSizesObj = typeof color_sizes === 'string' ? JSON.parse(color_sizes) : color_sizes;
      }
    } catch (e) {
      console.error('Error parsing color_sizes:', e);
    }

    // Parse size_stock from JSON string
    let sizeStockObj = product.size_stock || {};
    try {
      if (size_stock) {
        sizeStockObj = typeof size_stock === 'string' ? JSON.parse(size_stock) : size_stock;
      }
    } catch (e) {
      console.error('Error parsing size_stock:', e);
    }

    // Update product fields
    product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        product_name: product_name || product.product_name,
        brand: brand || product.brand,
        short_description: short_description || product.short_description,
        original_price: newOriginalPrice,
        sales_price: newSalesPrice,
        category: category || product.category,
        sizes: sizesArray,
        colors: colorsArray,
        color_sizes: colorSizesObj,
        size_stock: sizeStockObj,
        dimensions_in_inches: dimensions_in_inches !== undefined ? dimensions_in_inches : product.dimensions_in_inches,
        stock_quantity: stock_quantity !== undefined ? parseInt(stock_quantity) : product.stock_quantity,
        cover_image: coverImageUrl,
        additional_images: additionalImages,
        featured_product: featured_product === 'true' || featured_product === true || product.featured_product
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating product'
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Protected
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete cover image from Cloudinary
    if (product.cover_image) {
      await deleteImage(product.cover_image);
    }

    // Delete additional images from Cloudinary
    if (product.additional_images && product.additional_images.length > 0) {
      for (const imageUrl of product.additional_images) {
        await deleteImage(imageUrl);
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
});

// @route   GET /api/products/category/:category
// @desc    Get products by category
// @access  Public
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { sort, limit = 50, page = 1 } = req.query;

    // Build sort option
    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') {
      sortOption = { sales_price: 1 };
    } else if (sort === 'price_desc') {
      sortOption = { sales_price: -1 };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find({ category })
      .sort(sortOption)
      .limit(limitNum)
      .skip(skip);

    const total = await Product.countDocuments({ category });

    res.json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: products
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products by category'
    });
  }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured/list', async (req, res) => {
  try {
    const products = await Product.find({ featured_product: true })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products'
    });
  }
});

// @route   POST /api/products/deduct-stock
// @desc    Deduct stock when order is placed (ATOMIC with transaction)
// @access  Public
router.post('/deduct-stock', async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'No items provided'
      });
    }

    // Sanitize and validate input
    const sanitizedItems = items.map(item => ({
      productId: String(item.productId).trim(),
      size: item.size ? String(item.size).trim() : null,
      color: item.color ? String(item.color).trim() : null,
      quantity: Math.max(1, Math.min(100, parseInt(item.quantity) || 1)) // Clamp between 1-100
    }));

    // Validate all items and collect stock info in one pass
    const stockValidationResults = [];
    const updatedProducts = [];
    
    for (const item of sanitizedItems) {
      if (!item.productId) {
        continue;
      }

      // Use findOne with session for transaction consistency
      const product = await Product.findById(item.productId).session(session);
      
      if (!product) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      let availableStock = 0;
      let stockError = null;

      // Check stock using size_stock if available
      if (product.size_stock && item.color && item.size) {
        const colorStock = product.size_stock.get ? 
          product.size_stock.get(item.color) : 
          product.size_stock[item.color];
        
        if (colorStock) {
          availableStock = colorStock.get ? 
            colorStock.get(String(item.size)) : 
            colorStock[String(item.size)] || 0;
          
          if (availableStock < item.quantity) {
            stockError = `Insufficient stock for ${product.product_name} - ${item.color} Size ${item.size}. Available: ${availableStock}, Requested: ${item.quantity}`;
          }
        } else {
          stockError = `Size ${item.size} in ${item.color} not available for ${product.product_name}`;
        }
      } else if (product.stock_quantity !== undefined) {
        // Fallback to overall stock
        availableStock = product.stock_quantity || 0;
        if (availableStock < item.quantity) {
          stockError = `Insufficient stock for ${product.product_name}. Available: ${availableStock}, Requested: ${item.quantity}`;
        }
      }

      if (stockError) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Stock validation failed',
          error: stockError
        });
      }

      stockValidationResults.push({
        productId: item.productId,
        productName: product.product_name,
        color: item.color,
        size: item.size,
        requested: item.quantity,
        available: availableStock
      });

      // Calculate new stock values but don't update yet
      const newOverallStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
      
      let updatedSizeStock = product.size_stock ? 
        (product.size_stock.toJSON ? product.size_stock.toJSON() : {...product.size_stock}) : 
        {};
      
      if (item.color && item.size) {
        if (updatedSizeStock[item.color]) {
          const currentSizeStock = updatedSizeStock[item.color][String(item.size)] || 0;
          updatedSizeStock[item.color][String(item.size)] = Math.max(0, currentSizeStock - item.quantity);
          
          // Remove size if stock is 0
          if (updatedSizeStock[item.color][String(item.size)] === 0) {
            delete updatedSizeStock[item.color][String(item.size)];
          }
          // Remove color if no sizes left
          if (Object.keys(updatedSizeStock[item.color]).length === 0) {
            delete updatedSizeStock[item.color];
          }
        }
      }

      updatedProducts.push({
        productId: item.productId,
        newOverallStock,
        updatedSizeStock
      });
    }

    // If all validation passed, apply all updates within the transaction
    for (const update of updatedProducts) {
      await Product.findByIdAndUpdate(
        update.productId,
        {
          stock_quantity: update.newOverallStock,
          size_stock: update.updatedSizeStock
        },
        { session }
      );
    }

    // Commit the transaction
    await session.commitTransaction();
    
    // Fetch updated products to return in response
    const updatedProductData = await Promise.all(
      sanitizedItems.map(item => 
        Product.findById(item.productId)
      )
    );

    // Build response with updated stock info
    const responseProducts = updatedProductData.map((product, index) => {
      if (!product) return null;
      
      const item = sanitizedItems[index];
      return {
        id: product._id,
        name: product.product_name,
        stock_quantity: product.stock_quantity,
        variantStock: item.color && item.size && product.size_stock ? 
          (product.size_stock[item.color] ? product.size_stock[item.color][item.size] : 0) : 
          null
      };
    }).filter(Boolean);

    res.json({
      success: true,
      message: 'Stock deducted successfully',
      updatedProducts: responseProducts,
      validationResults: stockValidationResults
    });
  } catch (error) {
    // Abort transaction on any error
    try {
      await session.abortTransaction();
    } catch (abortError) {
      console.error('Error aborting transaction:', abortError);
    }
    
    console.error('Deduct stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deducting stock'
    });
  } finally {
    session.endSession();
  }
});

// @route   POST /api/products/check-stock
// @desc    Check if requested stock is available
// @access  Public
router.post('/check-stock', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items provided'
      });
    }

    // Sanitize and validate input
    const sanitizedItems = items.map(item => ({
      productId: String(item.productId).trim(),
      size: item.size ? String(item.size).trim() : null,
      color: item.color ? String(item.color).trim() : null,
      quantity: Math.max(1, Math.min(100, parseInt(item.quantity) || 1))
    }));

    const stockInfo = [];
    
    for (const item of sanitizedItems) {
      if (!item.productId) {
        continue;
      }

      const product = await Product.findById(item.productId);
      
      if (!product) {
        stockInfo.push({
          productId: item.productId,
          available: 0,
          requested: item.quantity,
          error: 'Product not found'
        });
        continue;
      }

      let available = 0;
      
      // Check stock using size_stock if available
      if (product.size_stock && item.color && item.size) {
        const colorStock = product.size_stock.get ? 
          product.size_stock.get(item.color) : 
          product.size_stock[item.color];
        if (colorStock) {
          available = colorStock.get ? 
            colorStock.get(String(item.size)) : 
            colorStock[String(item.size)] || 0;
        }
      } else if (product.color_sizes && item.color && item.size) {
        // Fallback to color_sizes array - count occurrences
        const colorSizesArray = product.color_sizes.get ? 
          product.color_sizes.get(item.color) : 
          product.color_sizes[item.color];
        if (colorSizesArray) {
          available = colorSizesArray.filter(s => String(s) === String(item.size)).length;
        }
      } else {
        // Fallback to overall stock
        available = product.stock_quantity || 0;
      }

      stockInfo.push({
        productId: item.productId,
        productName: product.product_name,
        color: item.color || null,
        size: item.size || null,
        available,
        requested: item.quantity,
        canFulfill: available >= item.quantity
      });
    }

    const allCanFulfill = stockInfo.every(info => info.canFulfill || info.error);

    res.json({
      success: allCanFulfill,
      message: allCanFulfill ? 'All items available' : 'Some items not available',
      stockInfo
    });
  } catch (error) {
    console.error('Check stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking stock'
    });
  }
});

// @route   GET /api/products/:id/stock
// @desc    Get stock info for a product
// @access  Public
router.get('/:id/stock', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Build stock response
    let stockResponse = {
      productId: product._id,
      productName: product.product_name,
      totalStock: product.stock_quantity,
      sizeStock: {}
    };

    // Add size_stock info if available
    if (product.size_stock) {
      // Handle both Map and plain object formats
      const sizeStockObj = product.size_stock.toJSON ? product.size_stock.toJSON() : product.size_stock;
      stockResponse.sizeStock = sizeStockObj;
    }

    // Add color_sizes info for backward compatibility
    if (product.color_sizes) {
      const colorSizesObj = product.color_sizes.toJSON ? product.color_sizes.toJSON() : product.color_sizes;
      stockResponse.colorSizes = colorSizesObj;
      
      // Calculate available stock per color/size from color_sizes array
      if (!product.size_stock) {
        const calculatedStock = {};
        for (const [color, sizes] of Object.entries(colorSizesObj)) {
          calculatedStock[color] = {};
          sizes.forEach(size => {
            calculatedStock[color][size] = (calculatedStock[color][size] || 0) + 1;
          });
        }
        stockResponse.sizeStock = calculatedStock;
      }
    }

    res.json({
      success: true,
      data: stockResponse
    });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock'
    });
  }
});

module.exports = router;
