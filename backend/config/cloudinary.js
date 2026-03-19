const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Configure multer for disk storage (works on Railway)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

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

// Custom upload function that uploads file from disk to Cloudinary
const uploadToCloudinary = (filePath, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
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
          // Delete the local file after upload to Cloudinary
          fs.unlink(filePath, () => {});
          resolve(result);
        }
      }
    );
  });
};

// Middleware for single cover image upload
const uploadCoverImage = (req, res, next) => {
  return new Promise((resolve, reject) => {
    // Use fields() to handle both cover_image and additional_images
    const uploadFields = upload.fields([
      { name: 'cover_image', maxCount: 1 },
      { name: 'additional_images', maxCount: 5 }
    ]);
    
    uploadFields(req, res, async (err) => {
      console.log('Multer fields callback, err:', err);
      
      // Don't error on unexpected field - just continue
      if (err && err.code !== 'LIMIT_UNEXPECTED_FILE') {
        console.error('Multer error:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      console.log('After multer, req.files:', req.files);
      
      try {
        // Handle cover image
        if (req.files && req.files['cover_image'] && req.files['cover_image'][0]) {
          const coverFile = req.files['cover_image'][0];
          console.log('Uploading cover image to Cloudinary from:', coverFile.path);
          const result = await uploadToCloudinary(coverFile.path, 'lekevogue/products/covers');
          req.file = {
            ...coverFile,
            path: result.secure_url,
            cloudinaryResult: result
          };
          console.log('Cover image uploaded:', result.secure_url);
        }
        
        // Handle additional images
        if (req.files && req.files['additional_images']) {
          const additionalFiles = req.files['additional_images'];
          console.log('Uploading', additionalFiles.length, 'additional images...');
          const uploadPromises = additionalFiles.map(file => 
            uploadToCloudinary(file.path, 'lekevogue/products/additional')
          );
          const results = await Promise.all(uploadPromises);
          req.files = additionalFiles.map((file, index) => ({
            ...file,
            path: results[index].secure_url,
            cloudinaryResult: results[index]
          }));
          console.log('Additional images uploaded');
        }
        
        next();
        resolve();
      } catch (error) {
        console.error('Cloudinary upload error:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to Cloudinary: ' + error.message
        });
      }
    });
  });
};

// Middleware for multiple additional images upload
const uploadAdditionalImages = (req, res, next) => {
  return new Promise((resolve, reject) => {
    upload.array('additional_images', 5)(req, res, async (err) => {
      // Don't error on unexpected field - just continue without files
      if (err && !err.message.includes('Unexpected field')) {
        console.error('Multer additional images error:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      try {
        // Only upload if there are files with content
        if (req.files && req.files.length > 0) {
          const validFiles = req.files.filter(f => f.path && f.size > 0);
          if (validFiles.length > 0) {
            const uploadPromises = validFiles.map(file => 
              uploadToCloudinary(file.path, 'lekevogue/products/additional')
            );
            const results = await Promise.all(uploadPromises);
            req.files = validFiles.map((file, index) => ({
              ...file,
              path: results[index].secure_url,
              cloudinaryResult: results[index]
            }));
          }
        }
        next();
        resolve();
      } catch (error) {
        console.error('Cloudinary additional images upload error:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload images to Cloudinary: ' + error.message
        });
      }
    });
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
