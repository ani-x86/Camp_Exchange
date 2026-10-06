import multer from 'multer';

// Memory storage: file is held as a Buffer in req.file.buffer.
// We stream it directly to Cloudinary — nothing touches disk.
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WEBP images are accepted.'), false);
  }
};

// 5 MB limit — sufficient for ID card photos
export const uploadIdCard = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('idCard');
