const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  guestLogin,
  refreshAccessToken,
  logout,
  getMe
} = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes with rate limiting
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/guest', authLimiter, guestLogin);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticateJWT, getMe);

module.exports = router;

