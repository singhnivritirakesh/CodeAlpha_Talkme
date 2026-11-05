const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const { rtcConfig } = require('../config/rtcConfig');

/**
 * Generate human-friendly meeting code like: abc-defg-hij
 */
const generateRoomCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
};

/**
 * Create a new room
 */
const createRoom = async (req, res, next) => {
  try {
    const { title, customCode } = req.body;
    const roomId = customCode ? customCode.trim().toLowerCase() : generateRoomCode();

    // Check if room code already exists
    const existing = await Room.findOne({ roomId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A room with this code already exists. Please pick another or generate a new one.'
      });
    }

    const hostId = req.user ? req.user.id || req.user._id : 'guest_' + uuidv4().slice(0, 8);
    const hostName = req.user ? req.user.username : 'Host';

    const room = new Room({
      roomId,
      title: (title || '').trim() || `${hostName}'s Meeting`,
      hostId,
      hostName,
      maxParticipants: 6
    });

    await room.save();

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: {
        roomId: room.roomId,
        title: room.title,
        hostId: room.hostId,
        hostName: room.hostName,
        maxParticipants: room.maxParticipants,
        createdAt: room.createdAt
      },
      iceServers: rtcConfig.iceServers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get room info or verify that room exists
 */
const getRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const cleanRoomId = roomId.trim().toLowerCase();

    let room = await Room.findOne({ roomId: cleanRoomId });

    // If room is not in DB yet (e.g. ad-hoc shared link), create it on the fly or return verified
    if (!room) {
      // Allow instant ad-hoc room creation on join
      const hostId = req.user ? req.user.id || req.user._id : 'guest_' + uuidv4().slice(0, 8);
      const hostName = req.user ? req.user.username : 'Host';

      room = new Room({
        roomId: cleanRoomId,
        title: `Room ${cleanRoomId}`,
        hostId,
        hostName,
        maxParticipants: 6
      });
      await room.save();
    }

    res.json({
      success: true,
      room: {
        roomId: room.roomId,
        title: room.title,
        hostId: room.hostId,
        hostName: room.hostName,
        isLocked: room.isLocked,
        maxParticipants: room.maxParticipants
      },
      iceServers: rtcConfig.iceServers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ICE server configuration
 */
const getIceServers = (req, res) => {
  res.json({
    success: true,
    iceServers: rtcConfig.iceServers
  });
};

module.exports = {
  createRoom,
  getRoom,
  getIceServers
};

