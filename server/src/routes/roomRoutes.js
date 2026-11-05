const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRoom,
  getIceServers
} = require('../controllers/roomController');
const { optionalAuth } = require('../middleware/authMiddleware');

// Get ICE servers configuration
router.get('/ice-servers', getIceServers);

// Create a room (optional auth: supports both logged-in users and guests)
router.post('/create', optionalAuth, createRoom);

// Get room details / verify room
router.get('/:roomId', optionalAuth, getRoom);

module.exports = router;

