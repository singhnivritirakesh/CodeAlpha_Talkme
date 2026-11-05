/**
 * WebRTC Signaling Handler for Mesh Topology
 * In a mesh network, every participant connects directly via peer-to-peer to every other participant.
 * For N participants, each node maintains (N - 1) RTCPeerConnections.
 */

// Active in-memory room registry
// Map<roomId, Map<socketId, participantData>>
const rooms = new Map();

const registerSignalingHandlers = (io, socket) => {
  /**
   * Client joins a room
   * Payload: { roomId, user }
   */
  socket.on('join-room', ({ roomId, user }) => {
    if (!roomId) return;

    const cleanRoomId = roomId.trim().toLowerCase();
    const roomChannel = `room_${cleanRoomId}`;

    if (!rooms.has(cleanRoomId)) {
      rooms.set(cleanRoomId, new Map());
    }

    const currentRoom = rooms.get(cleanRoomId);

    // Limit check for mesh topology performance (4-6 users recommended)
    if (currentRoom.size >= 8) {
      socket.emit('room-error', {
        message: 'This room has reached the maximum participant limit (8 users) for mesh video calling.'
      });
      return;
    }

    const participant = {
      socketId: socket.id,
      userId: user?.userId || socket.user?.userId || socket.id,
      username: user?.username || socket.user?.username || 'Participant',
      avatar: user?.avatar || socket.user?.avatar || '',
      isAudioMuted: user?.isAudioMuted || false,
      isVideoOff: user?.isVideoOff || false,
      isScreenSharing: false,
      joinedAt: new Date().toISOString()
    };

    // Store participant in room
    currentRoom.set(socket.id, participant);
    socket.roomId = cleanRoomId;
    socket.join(roomChannel);

    console.log(`[Signaling] Socket ${socket.id} (${participant.username}) joined room ${cleanRoomId}. Total: ${currentRoom.size}`);

    // Send the list of existing participants to the joining user
    const existingParticipants = [];
    currentRoom.forEach((p, sId) => {
      if (sId !== socket.id) {
        existingParticipants.push(p);
      }
    });

    socket.emit('existing-participants', {
      roomId: cleanRoomId,
      participants: existingParticipants
    });

    // Notify all existing members that a new user has joined
    socket.to(roomChannel).emit('user-joined', {
      participant
    });

    // Send updated participant count/list
    io.to(roomChannel).emit('room-participants-update', {
      participants: Array.from(currentRoom.values())
    });
  });

  /**
   * WebRTC Offer Relay
   * Existing peer -> Server -> New peer
   * Payload: { toSocketId, offer }
   */
  socket.on('offer', ({ toSocketId, offer }) => {
    if (!toSocketId || !offer) return;
    io.to(toSocketId).emit('offer', {
      fromSocketId: socket.id,
      offer,
      sender: rooms.get(socket.roomId)?.get(socket.id) || socket.user
    });
  });

  /**
   * WebRTC Answer Relay
   * New peer -> Server -> Existing peer
   * Payload: { toSocketId, answer }
   */
  socket.on('answer', ({ toSocketId, answer }) => {
    if (!toSocketId || !answer) return;
    io.to(toSocketId).emit('answer', {
      fromSocketId: socket.id,
      answer,
      sender: rooms.get(socket.roomId)?.get(socket.id) || socket.user
    });
  });

  /**
   * WebRTC ICE Candidate Relay
   * Peer A <-> Server <-> Peer B
   * Payload: { toSocketId, candidate }
   */
  socket.on('ice-candidate', ({ toSocketId, candidate }) => {
    if (!toSocketId || !candidate) return;
    io.to(toSocketId).emit('ice-candidate', {
      fromSocketId: socket.id,
      candidate
    });
  });

  /**
   * Media State Change (Mute, Video toggle, Screen share)
   * Broadcasts to all peers in the room
   */
  socket.on('media-state-change', ({ isAudioMuted, isVideoOff, isScreenSharing }) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const participant = rooms.get(roomId).get(socket.id);
    if (participant) {
      if (typeof isAudioMuted === 'boolean') participant.isAudioMuted = isAudioMuted;
      if (typeof isVideoOff === 'boolean') participant.isVideoOff = isVideoOff;
      if (typeof isScreenSharing === 'boolean') participant.isScreenSharing = isScreenSharing;

      socket.to(`room_${roomId}`).emit('user-media-state-changed', {
        socketId: socket.id,
        isAudioMuted: participant.isAudioMuted,
        isVideoOff: participant.isVideoOff,
        isScreenSharing: participant.isScreenSharing
      });
    }
  });

  /**
   * Leave room handler
   */
  const handleLeaveRoom = () => {
    const roomId = socket.roomId;
    if (!roomId) return;

    const currentRoom = rooms.get(roomId);
    if (currentRoom && currentRoom.has(socket.id)) {
      const leavingParticipant = currentRoom.get(socket.id);
      currentRoom.delete(socket.id);

      console.log(`[Signaling] Socket ${socket.id} left room ${roomId}. Remaining: ${currentRoom.size}`);

      // Notify other peers to close the RTCPeerConnection for this socket
      socket.to(`room_${roomId}`).emit('user-left', {
        socketId: socket.id,
        participant: leavingParticipant
      });

      // Update participant list
      socket.to(`room_${roomId}`).emit('room-participants-update', {
        participants: Array.from(currentRoom.values())
      });

      if (currentRoom.size === 0) {
        rooms.delete(roomId);
      }
    }

    socket.leave(`room_${roomId}`);
    delete socket.roomId;
  };

  socket.on('leave-room', handleLeaveRoom);
  socket.on('disconnecting', handleLeaveRoom);
};

module.exports = { registerSignalingHandlers, rooms };

