const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify JWT Access Token
 */
const authenticateJWT = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const secret = process.env.JWT_ACCESS_SECRET || 'talkme_jwt_access_secret_super_key_38291048';
    const decoded = jwt.verify(token, secret);

    // If it's a guest token, attach the guest user info directly
    if (decoded.isGuest) {
      req.user = {
        _id: decoded.userId,
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        avatar: decoded.avatar,
        isGuest: true
      };
      return next();
    }

    // If registered user, fetch from DB
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: User not found.'
      });
    }

    req.user = {
      _id: user._id.toString(),
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isGuest: false
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        isExpired: true
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid token',
      error: error.message
    });
  }
};

/**
 * Optional authentication: attaches user if valid token exists, otherwise proceeds as anonymous
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const secret = process.env.JWT_ACCESS_SECRET || 'talkme_jwt_access_secret_super_key_38291048';
    const decoded = jwt.verify(token, secret);

    if (decoded.isGuest) {
      req.user = {
        _id: decoded.userId,
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        avatar: decoded.avatar,
        isGuest: true
      };
    } else {
      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = {
          _id: user._id.toString(),
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isGuest: false
        };
      }
    }
    next();
  } catch {
    req.user = null;
    next();
  }
};

module.exports = { authenticateJWT, optionalAuth };

