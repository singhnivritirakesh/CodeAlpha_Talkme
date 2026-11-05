const { v4: uuidv4 } = require('uuid');

const registerChatHandlers = (io, socket) => {
  /**
   * Send a chat message to the room
   * Payload: { roomId, text }
   */
  socket.on('send-message', ({ roomId, text }) => {
    if (!roomId || !text || !text.trim()) return;

    const cleanRoomId = roomId.trim().toLowerCase();
    const cleanText = text.trim().slice(0, 2000); // Max length limit for security

    const messagePayload = {
      id: uuidv4(),
      roomId: cleanRoomId,
      senderId: socket.user?.userId || socket.id,
      senderSocketId: socket.id,
      senderName: socket.user?.username || 'Participant',
      senderAvatar: socket.user?.avatar || '',
      isGuest: Boolean(socket.user?.isGuest),
      text: cleanText,
      timestamp: new Date().toISOString()
    };

    io.to(`room_${cleanRoomId}`).emit('new-message', messagePayload);
  });
};

module.exports = { registerChatHandlers };

