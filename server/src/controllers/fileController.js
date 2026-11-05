const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Disallowed dangerous extensions for security
const DISALLOWED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.vbs', '.msi', '.com', '.scr', '.pif', '.dll'
];

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  }
});

// Multer file filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (DISALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Executable and potentially malicious files are blocked for security.'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50) * 1024 * 1024 // 50MB
  }
});

/**
 * Upload a file (Fallback when WebRTC Data Channel is not available or peer is offline)
 */
const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded.'
    });
  }

  const fileInfo = {
    fileId: path.basename(req.file.filename, path.extname(req.file.filename)),
    storedName: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    uploadedAt: new Date().toISOString(),
    uploader: req.user ? req.user.username : 'Anonymous',
    downloadUrl: `/api/files/download/${req.file.filename}`
  };

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    file: fileInfo
  });
};

/**
 * Download a file by filename
 */
const downloadFile = (req, res) => {
  const { filename } = req.params;

  // Sanitize filename to prevent path traversal attacks
  const safeFilename = path.basename(filename);
  const filePath = path.join(uploadDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File not found or expired.'
    });
  }

  res.download(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error downloading file.'
      });
    }
  });
};

module.exports = {
  upload,
  uploadFile,
  downloadFile
};

