const express = require('express');
const router = express.Router();
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
      subcategory,
      sizes,
      colors,
      dimensions_in_inches,
      stock_quantity,
      featured_product
    } = req.body;

    // Validation: Required fields
    if (!product_name || !short_description || !original_price || !category || !stock_quantity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
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

    // Check if cover image is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Cover image is required'
      });
    }

    // Get cover image URL from Cloudinary
    const coverImageUrl = req.file.path;

    // Get additional images URLs
    const additionalImages = req.files ? req.files.map(file => file.path) : [];

    // Parse sizes and colors from comma-separated strings to arrays
    const sizesArray = sizes ? sizes.split(',').map(s => s.trim()).filter(s => s) : [];
    const colorsArray = colors ? colors.split(',').map(c => c.trim()).filter(c => c) : [];

    const product = new Product({
      product_name,
      brand: brand || '',
      short_description,
      original_price: parseFloat(original_price) || 0,
      sales_price: parseFloat(sales_price) || parseFloat(original_price) || 0,
      category,
      subcategory: subcategory || '',
      sizes: sizesArray,
      colors: colorsArray,
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
    const product = await Product.findById(req.params.id);

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
router.put('/:id', protect, uploadCoverImage.single('cover_image'), uploadAdditionalImages.array('additional_images', 5), async (req, res) => {
  try {
    const {
      product_name,
      brand,
      short_description,
      original_price,
      sales_price,
      category,
      subcategory,
      sizes,
      colors,
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
    const newSalesPrice = parseFloat(sales_price) || product.sales_price;
    
    if (newSalesPrice > newOriginalPrice) {
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

    // Handle cover image update
    let coverImageUrl = existing_cover_image || product.cover_image;
    if (req.file) {
      // Delete old cover image from Cloudinary
      if (product.cover_image) {
        await deleteImage(product.cover_image);
      }
      coverImageUrl = req.file.path;
    }

    // Handle additional images update
    let additionalImages = product.additional_images;
    if (existing_additional_images) {
      // Parse existing images from JSON string
      additionalImages = JSON.parse(existing_additional_images);
    }
    if (req.files && req.files.length > 0) {
      // Add new additional images
      const newImages = req.files.map(file => file.path);
      additionalImages = [...additionalImages, ...newImages];
    }

    // Parse sizes and colors from comma-separated strings to arrays
    const sizesArray = sizes ? sizes.split(',').map(s => s.trim()).filter(s => s) : product.sizes;
    const colorsArray = colors ? colors.split(',').map(c => c.trim()).filter(c => c) : product.colors;

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
        subcategory: subcategory !== undefined ? subcategory : product.subcategory,
        sizes: sizesArray,
        colors: colorsArray,
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

module.exports = router;
