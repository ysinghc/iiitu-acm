const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Ensure Cloudinary uses secure HTTPS URLs
cloudinary.config({
  secure: true
});

// Helper for dynamic sharp loading (prevents esbuild/wrangler from bundling native .node binaries on Cloudflare Workers)
const getSharp = () => {
  try {
    return eval('require')('sharp');
  } catch (err) {
    return null;
  }
};

// Configure multer memory storage
const storage = multer.memoryStorage();

// Accept strictly JPEG and PNG
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG (.jpg, .jpeg) and PNG (.png) images are allowed'), false);
  }
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('image');

/**
 * Helper to upload image buffer to Cloudinary with WebP conversion
 */
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'iiitu-acm',
        format: 'webp',
        transformation: [{ quality: 'auto:good' }]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

const handleImageUpload = (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    try {
      // If Cloudinary URL environment variable is set, upload directly to Cloudinary
      if (process.env.CLOUDINARY_URL) {
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer);
        return res.json({
          message: 'Image uploaded and converted to WebP on Cloudinary successfully',
          imageUrl: cloudinaryResult.secure_url
        });
      }

      // Fallback: Local filesystem storage (for local dev without CLOUDINARY_URL)
      const sharp = getSharp();
      if (!sharp) {
        throw new Error('Local image processing (sharp) is not available. Please configure CLOUDINARY_URL.');
      }

      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
      const outputPath = path.join(uploadsDir, filename);

      // Convert JPEG/PNG buffer to optimized WebP format
      await sharp(req.file.buffer)
        .webp({ quality: 82 })
        .toFile(outputPath);

      const imageUrl = `/uploads/${filename}`;
      return res.json({
        message: 'Image uploaded and converted to WebP successfully',
        imageUrl
      });
    } catch (uploadErr) {
      console.error('Image upload error:', uploadErr);
      return res.status(500).json({ error: 'Failed to process and upload image', details: uploadErr.message });
    }
  });
};


module.exports = {
  handleImageUpload
};

