const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test Cloudinary connection
cloudinary.api.ping((error, result) => {
  if (error) {
    console.error('Cloudinary connection error:', error.message);
  } else {
    console.log('Cloudinary connected successfully');
  }
});

// Configure multer for memory storage (we'll upload to Cloudinary directly)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Custom upload function that uploads directly to Cloudinary
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    
    uploadStream.end(fileBuffer);
  });
};

// Middleware for single cover image upload
const uploadCoverImage = async (req, res, next) => {
  upload.single('cover_image')(req, res, async (err) => {
    if (err) {
      console.error('Multer cover image error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    try {
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, 'lekevogue/products/covers');
        req.file.path = result.secure_url;
        req.file.cloudinaryResult = result;
      }
      next();
    } catch (error) {
      console.error('Cloudinary cover image upload error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image to Cloudinary: ' + error.message
      });
    }
  });
};

// Middleware for multiple additional images upload
const uploadAdditionalImages = async (req, res, next) => {
  upload.array('additional_images', 5)(req, res, async (err) => {
    if (err) {
      console.error('Multer additional images error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    try {
      if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map(file => 
          uploadToCloudinary(file.buffer, 'lekevogue/products/additional')
        );
        const results = await Promise.all(uploadPromises);
        req.files = req.files.map((file, index) => ({
          ...file,
          path: results[index].secure_url,
          cloudinaryResult: results[index]
        }));
      }
      next();
    } catch (error) {
      console.error('Cloudinary additional images upload error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload images to Cloudinary: ' + error.message
      });
    }
  });
};

// Function to delete image from Cloudinary
const deleteImage = async (imageUrl) => {
  try {
    if (imageUrl && imageUrl.includes('cloudinary.com')) {
      // Extract public ID from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const publicId = 'lekevogue/products/' + fileName.split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error.message);
  }
};

module.exports = {
  cloudinary,
  uploadCoverImage,
  uploadAdditionalImages,
  deleteImage,
  upload
};
