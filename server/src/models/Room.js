const mongoose = require('mongoose');
const { isDbConnected } = require('../config/db');
const { MemoryRoom, memoryRoomStore } = require('./memoryStore');

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      default: 'Talkme Conference Room',
      trim: true
    },
    hostId: {
      type: String,
      required: true
    },
    hostName: {
      type: String,
      required: true
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    maxParticipants: {
      type: Number,
      default: 6
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 7
    }
  },
  {
    timestamps: true
  }
);

const MongooseRoom = mongoose.model('Room', roomSchema);

const RoomProxy = function (data) {
  if (isDbConnected()) {
    return new MongooseRoom(data);
  }
  return new MemoryRoom(data);
};

RoomProxy.findOne = function (query) {
  if (isDbConnected()) {
    return MongooseRoom.findOne(query);
  }
  return memoryRoomStore.findOne(query);
};

module.exports = RoomProxy;
