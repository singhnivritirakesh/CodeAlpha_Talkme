const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const usersFile = path.join(dataDir, 'users.json');
const roomsFile = path.join(dataDir, 'rooms.json');

const loadData = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.warn(`[Storage] Failed to read ${filePath}:`, err.message);
  }
  return [];
};

const saveData = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[Storage] Failed to write ${filePath}:`, err.message);
  }
};

let memoryUsers = loadData(usersFile);
let memoryRooms = loadData(roomsFile);

class MemoryUser {
  constructor(data) {
    this._id = data._id || 'user_' + Math.random().toString(36).substring(2, 10);
    this.username = data.username;
    this.email = data.email?.toLowerCase();
    this.password = data.password;
    this.avatar = data.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(data.username || '')}`;
    this.refreshTokens = data.refreshTokens || [];
    this.isGuest = Boolean(data.isGuest);
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  generateAccessToken() {
    const secret = process.env.JWT_ACCESS_SECRET || 'talkme_jwt_access_secret_super_key_38291048';
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';

    return jwt.sign(
      {
        userId: this._id,
        username: this.username,
        email: this.email,
        avatar: this.avatar,
        isGuest: this.isGuest
      },
      secret,
      { expiresIn }
    );
  }

  generateRefreshToken() {
    const secret = process.env.JWT_REFRESH_SECRET || 'talkme_jwt_refresh_secret_super_key_92817346';
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    return jwt.sign(
      {
        userId: this._id
      },
      secret,
      { expiresIn }
    );
  }

  async save() {
    // If password is not hashed, hash it
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    const index = memoryUsers.findIndex((u) => u._id === this._id);
    const plain = {
      _id: this._id,
      username: this.username,
      email: this.email,
      password: this.password,
      avatar: this.avatar,
      refreshTokens: this.refreshTokens,
      isGuest: this.isGuest,
      createdAt: this.createdAt,
      updatedAt: new Date()
    };

    if (index >= 0) {
      memoryUsers[index] = plain;
    } else {
      memoryUsers.push(plain);
    }
    saveData(usersFile, memoryUsers);
    return this;
  }
}

const memoryUserStore = {
  async findOne(query) {
    let match = null;
    if (query.$or) {
      match = memoryUsers.find((u) => {
        return query.$or.some((clause) => {
          if (clause.email && u.email === clause.email.toLowerCase()) return true;
          if (clause.username && u.username === clause.username) return true;
          return false;
        });
      });
    } else if (query.email) {
      match = memoryUsers.find((u) => u.email === query.email.toLowerCase());
    } else if (query.username) {
      match = memoryUsers.find((u) => u.username === query.username);
    } else if (query._id) {
      match = memoryUsers.find((u) => u._id === query._id);
    }

    if (!match) return null;
    const userInstance = new MemoryUser(match);
    // Chainable .select('+password') mock
    return {
      ...userInstance,
      select: () => userInstance,
      comparePassword: (p) => userInstance.comparePassword(p),
      generateAccessToken: () => userInstance.generateAccessToken(),
      generateRefreshToken: () => userInstance.generateRefreshToken(),
      save: () => userInstance.save()
    };
  },

  async findById(id) {
    const match = memoryUsers.find((u) => u._id === id);
    if (!match) return null;
    return new MemoryUser(match);
  },

  generateGuestToken(guestName) {
    const secret = process.env.JWT_ACCESS_SECRET || 'talkme_jwt_access_secret_super_key_38291048';
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(guestName || guestId)}`;

    const token = jwt.sign(
      {
        userId: guestId,
        username: guestName || `Guest_${guestId.slice(-4)}`,
        email: `${guestId}@guest.talkme.io`,
        avatar,
        isGuest: true
      },
      secret,
      { expiresIn: '24h' }
    );

    return {
      user: {
        _id: guestId,
        id: guestId,
        username: guestName || `Guest_${guestId.slice(-4)}`,
        email: `${guestId}@guest.talkme.io`,
        avatar,
        isGuest: true
      },
      accessToken: token
    };
  }
};

class MemoryRoom {
  constructor(data) {
    this._id = data._id || 'room_' + Math.random().toString(36).substring(2, 10);
    this.roomId = data.roomId;
    this.title = data.title || 'Talkme Conference Room';
    this.hostId = data.hostId;
    this.hostName = data.hostName;
    this.isLocked = Boolean(data.isLocked);
    this.maxParticipants = data.maxParticipants || 6;
    this.createdAt = data.createdAt || new Date();
  }

  async save() {
    const index = memoryRooms.findIndex((r) => r.roomId === this.roomId);
    const plain = {
      _id: this._id,
      roomId: this.roomId,
      title: this.title,
      hostId: this.hostId,
      hostName: this.hostName,
      isLocked: this.isLocked,
      maxParticipants: this.maxParticipants,
      createdAt: this.createdAt
    };
    if (index >= 0) {
      memoryRooms[index] = plain;
    } else {
      memoryRooms.push(plain);
    }
    saveData(roomsFile, memoryRooms);
    return this;
  }
}

const memoryRoomStore = {
  async findOne(query) {
    let match = null;
    if (query.roomId) {
      match = memoryRooms.find((r) => r.roomId === query.roomId.toLowerCase());
    } else if (query._id) {
      match = memoryRooms.find((r) => r._id === query._id);
    }
    if (!match) return null;
    return new MemoryRoom(match);
  }
};

module.exports = {
  MemoryUser,
  memoryUserStore,
  MemoryRoom,
  memoryRoomStore
};

