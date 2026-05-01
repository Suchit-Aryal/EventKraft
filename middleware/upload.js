// ============================================================
// Upload Middleware — Multer (memory) + Cloudinary manual upload
// ============================================================

const multer = require('multer');

// Store files in memory temporarily, then upload to Cloudinary in controller
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
        }
    }
});

module.exports = upload;
