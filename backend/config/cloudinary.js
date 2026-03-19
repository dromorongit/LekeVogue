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

// Custom upload function that uploads directly to Cloudinary from a stream
const uploadStreamToCloudinary = (readStream, folder) => {
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
    
    readStream.pipe(uploadStream);
  });
};

// Middleware for single cover image upload
const uploadCoverImage = (req, res, next) => {
  return new Promise((resolve, reject) => {
    upload.single('cover_image')(req, res, async (err) => {
      // Don't error on unexpected field - just continue without file
      if (err && !err.message.includes('Unexpected field')) {
        console.error('Multer cover image error:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      console.log('Cover image upload middleware - req.file:', req.file);
      console.log('Cover image upload middleware - req.file.buffer:', req.file.buffer);
      console.log('Cover image upload middleware - req.file.stream:', req.file.stream);
      
      try {
        // Check if there's a file with content - buffer may or may not exist with memoryStorage
        const hasFileContent = req.file && (
          (req.file.buffer && req.file.buffer.length > 0) || 
          (req.file.size > 0)
        );
        
        if (hasFileContent) {
          console.log('Uploading cover image to Cloudinary...');
          let result;
          
          // Use stream if available (Railway), otherwise use buffer
          if (req.file.stream) {
            result = await uploadStreamToCloudinary(req.file.stream, 'lekevogue/products/covers');
          } else if (req.file.buffer) {
            result = await uploadToCloudinary(req.file.buffer, 'lekevogue/products/covers');
          } else {
            throw new Error('No file content available');
          }
          
          req.file.path = result.secure_url;
          req.file.cloudinaryResult = result;
          console.log('Cover image uploaded successfully:', result.secure_url);
        } else {
          // No file uploaded - will be handled by route
          console.log('No cover image file found in request - file has no content');
          req.file = undefined;
        }
        next();
        resolve();
      } catch (error) {
        console.error('Cloudinary cover image upload error:', error.message);
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
        // Only upload if there are actually files with content
        if (req.files && req.files.length > 0) {
          const validFiles = req.files.filter(f => 
            (f.buffer && f.buffer.length > 0) || (f.size > 0)
          );
          if (validFiles.length > 0) {
            // Upload each file using stream or buffer
            const uploadPromises = validFiles.map(async (file) => {
              if (file.stream) {
                return await uploadStreamToCloudinary(file.stream, 'lekevogue/products/additional');
              } else if (file.buffer) {
                return await uploadToCloudinary(file.buffer, 'lekevogue/products/additional');
              }
              throw new Error('No file content available');
            });
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
