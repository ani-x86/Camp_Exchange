import multer from 'multer';

// Memory storage: file is held as a Buffer in req.file.buffer.
// We stream it directly to Cloudinary — nothing touches disk.
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only JPEG, PNG, and WEBP images are accepted.'), { status: 415 }), false);
  }
};

// 5 MB limit — sufficient for ID card photos
export const uploadIdCard = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('idCard');

const productImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
    fields: 8,
    parts: 14,
  },
}).array('images', 6);

export function uploadProductImages(req, res, next) {
  productImageUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      res.status(status).json({
        error: status === 413
          ? 'Each image must be 5 MB or smaller.'
          : 'Upload up to 6 valid images using the "images" field.',
      });
      return;
    }

    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    next(error);
  });
}
