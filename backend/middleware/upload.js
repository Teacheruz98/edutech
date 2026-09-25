const multer = require('multer');
const path = require('path');

const ALLOWED_TYPES = [
    // Documents
    'application/pdf',
    'text/html', 'text/plain',
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Audio
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/x-m4a',
    // Video
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    // Office
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/octet-stream' // fallback for some browsers
];

const ALLOWED_EXTENSIONS = [
    '.pdf', '.html', '.htm', '.txt',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.mp3', '.wav', '.ogg', '.m4a', '.aac',
    '.mp4', '.webm', '.mov', '.avi', '.mkv',
    '.doc', '.docx', '.ppt', '.pptx'
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => {
        // Sanitize filename: replace spaces and special chars with dashes
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, Date.now() + '-' + safeName);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
    const isAllowedType = ALLOWED_TYPES.includes(file.mimetype);
    if (isAllowedExt || isAllowedType) {
        cb(null, true);
    } else {
        cb(null, true); // Accept all for now; log warning
        console.warn(`[Upload] Potentially unsupported file type: ${file.mimetype} (${file.originalname})`);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max file size
    }
});

const uploadDocx = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB for docx
});

module.exports = { upload, uploadDocx };
