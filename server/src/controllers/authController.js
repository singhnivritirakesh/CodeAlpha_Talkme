const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to configure cookie options
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

/**
 * Register a new user
 */
const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email.toLowerCase()
          ? 'An account with this email already exists.'
          : 'Username is already taken.'
      });
    }

    // Generate avatar seed
    const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(username)}`;

    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      avatar
    });

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshTokens = [refreshToken];
    await user.save();

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isGuest: false
      },
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user with email & password
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.'
      });
    }

    // Must explicitly select password because it's marked select: false in schema
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Maintain max 5 active refresh tokens per user
    user.refreshTokens = [...user.refreshTokens.slice(-4), refreshToken];
    await user.save();

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isGuest: false
      },
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Guest login - Instant frictionless access
 */
const guestLogin = async (req, res, next) => {
  try {
    const { guestName } = req.body;
    const name = (guestName || '').trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;

    const { user, accessToken } = User.generateGuestToken(name);

    res.json({
      success: true,
      message: 'Guest session created',
      user,
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided.'
      });
    }

    const secret = process.env.JWT_REFRESH_SECRET || 'talkme_jwt_refresh_secret_super_key_92817346';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired refresh token.'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.refreshTokens.includes(token)) {
      // Possible token reuse / breach: clear all refresh tokens for security
      if (user) {
        user.refreshTokens = [];
        await user.save();
      }
      return res.status(403).json({
        success: false,
        message: 'Refresh token invalid or revoked.'
      });
    }

    // Rotate refresh token
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.cookie('refreshToken', newRefreshToken, getCookieOptions());

    res.json({
      success: true,
      accessToken: newAccessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isGuest: false
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user - invalidate refresh token
 */
const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (token) {
      try {
        const secret = process.env.JWT_REFRESH_SECRET || 'talkme_jwt_refresh_secret_super_key_92817346';
        const decoded = jwt.verify(token, secret);
        const user = await User.findById(decoded.userId);
        if (user) {
          user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
          await user.save();
        }
      } catch {
        // Ignore token decode error on logout
      }
    }

    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 */
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

module.exports = {
  signup,
  login,
  guestLogin,
  refreshAccessToken,
  logout,
  getMe
};

