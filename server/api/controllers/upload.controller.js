const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const multer = require('multer');

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
    } catch (sharpErr) {
      console.error('Sharp conversion error:', sharpErr);
      return res.status(500).json({ error: 'Failed to process and convert image to WebP' });
    }
  });
};

module.exports = {
  handleImageUpload
};
