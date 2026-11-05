const express = require('express');
const router = express.Router();
const { upload, uploadFile, downloadFile } = require('../controllers/fileController');
const { optionalAuth } = require('../middleware/authMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Upload endpoint with rate limiting, file validation, and optional auth
router.post('/upload', uploadLimiter, optionalAuth, upload.single('file'), uploadFile);

// Download file endpoint
router.get('/download/:filename', downloadFile);

module.exports = router;

