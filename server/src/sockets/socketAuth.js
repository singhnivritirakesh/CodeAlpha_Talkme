const jwt = require('jsonwebtoken');

/**
 * Socket.IO Authentication Middleware
 * Validates JWT access token passed via socket.handshake.auth.token
 * or creates a verified guest identity if connecting with guest credentials.
 */
const socketAuthMiddleware = (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;

    const secret = process.env.JWT_ACCESS_SECRET || 'talkme_jwt_access_secret_super_key_38291048';

    if (token) {
      try {
        const decoded = jwt.verify(token, secret);
        socket.user = {
          userId: decoded.userId,
          username: decoded.username || 'Anonymous',
          email: decoded.email || '',
          avatar: decoded.avatar || '',
          isGuest: Boolean(decoded.isGuest)
        };
        return next();
      } catch (err) {
        console.warn(`[SocketAuth] Token verification failed: ${err.message}. Assigning fallback guest session.`);
      }
    }

    // Guest fallback with provided or generated name
    const guestName = socket.handshake.auth?.username || `Guest_${socket.id.slice(0, 5)}`;
    socket.user = {
      userId: `guest_${socket.id.slice(0, 8)}`,
      username: guestName,
      email: '',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(guestName)}`,
      isGuest: true
    };

    next();
  } catch (error) {
    next(new Error(`Socket authentication error: ${error.message}`));
  }
};

module.exports = { socketAuthMiddleware };

