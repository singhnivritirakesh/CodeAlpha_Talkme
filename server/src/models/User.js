const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isDbConnected } = require('../config/db');
const { MemoryUser, memoryUserStore } = require('./memoryStore');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [2, 'Username must be at least 2 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false
    },
    avatar: {
      type: String,
      default: ''
    },
    refreshTokens: {
      type: [String],
      default: []
    },
    isGuest: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAccessToken = function () {
  const secret = process.env.JWT_ACCESS_SECRET || 'talkme_jwt_access_secret_super_key_38291048';
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';

  return jwt.sign(
    {
      userId: this._id.toString(),
      username: this.username,
      email: this.email,
      avatar: this.avatar,
      isGuest: this.isGuest
    },
    secret,
    { expiresIn }
  );
};

userSchema.methods.generateRefreshToken = function () {
  const secret = process.env.JWT_REFRESH_SECRET || 'talkme_jwt_refresh_secret_super_key_92817346';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      userId: this._id.toString()
    },
    secret,
    { expiresIn }
  );
};

const MongooseUser = mongoose.model('User', userSchema);

// Hybrid proxy that delegates to Mongoose when connected, or memoryStore when disconnected
const UserProxy = function (data) {
  if (isDbConnected()) {
    return new MongooseUser(data);
  }
  return new MemoryUser(data);
};

UserProxy.findOne = function (query) {
  if (isDbConnected()) {
    return MongooseUser.findOne(query);
  }
  return memoryUserStore.findOne(query);
};

UserProxy.findById = function (id) {
  if (isDbConnected()) {
    return MongooseUser.findById(id);
  }
  return memoryUserStore.findById(id);
};

UserProxy.generateGuestToken = function (guestName) {
  return memoryUserStore.generateGuestToken(guestName);
};

module.exports = UserProxy;
