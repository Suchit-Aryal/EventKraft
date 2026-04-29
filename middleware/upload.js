// ============================================================
// Upload Middleware — Multer + Cloudinary for image uploads
// ============================================================

const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const path = require('path');

// Use memory storage so we can stream to Cloudinary
const storage = multer.memoryStorage();

// File filter — only allow images
const fileFilter = (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (jpg, png, webp, gif) are allowed'), false);
    }
};

// Multer instance — max 5 files, 5MB each
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 5 }
});

// Helper: upload a single buffer to Cloudinary
function uploadToCloudinary(fileBuffer, folder = 'eventkraft/gigs') {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
                transformation: [
                    { width: 1200, height: 800, crop: 'limit', quality: 'auto:good' }
                ]
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(fileBuffer);
    });
}

// Middleware: upload files to Cloudinary and attach URLs to req.body
async function uploadGigImages(req, res, next) {
    try {
        if (req.files && req.files.length > 0) {
            const urls = [];
            for (const file of req.files) {
                const url = await uploadToCloudinary(file.buffer);
                urls.push(url);
            }
            req.body.portfolio_images = urls;
        }
        next();
    } catch (err) {
        console.error('Image upload error:', err);
        req.flash('error', 'Failed to upload images. Please try again.');
        return res.redirect('/gigs/create');
    }
}

module.exports = { upload, uploadGigImages };
