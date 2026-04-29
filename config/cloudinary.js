// ============================================================
// Cloudinary Configuration — Image Uploads
// ============================================================

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
    api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
    api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
});

module.exports = cloudinary;
