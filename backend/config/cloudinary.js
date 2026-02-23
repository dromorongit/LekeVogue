const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create Cloudinary storage engine for cover image
const coverImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'lekevogue/products/covers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
  }
});

// Create Cloudinary storage engine for additional images
const additionalImagesStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'lekevogue/products/additional',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }]
  }
});

// Create multer upload instances
const uploadCoverImage = multer({ storage: coverImageStorage });
const uploadAdditionalImages = multer({ storage: additionalImagesStorage });

// Function to delete image from Cloudinary
const deleteImage = async (imageUrl) => {
  try {
    if (imageUrl && imageUrl.includes('cloudinary.com')) {
      // Extract public ID from URL
      const publicId = imageUrl.split('/').pop().split('.')[0];
      const fullPublicId = `lekevogue/products/${publicId}`;
      await cloudinary.uploader.destroy(fullPublicId);
    }
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
  }
};

module.exports = {
  cloudinary,
  uploadCoverImage,
  uploadAdditionalImages,
  deleteImage
};
