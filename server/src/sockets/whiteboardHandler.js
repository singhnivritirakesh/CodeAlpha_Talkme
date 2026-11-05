// In-memory whiteboard stroke buffer per room
// Map<roomId, Array<drawAction>>
const whiteboardHistories = new Map();

const MAX_HISTORY_LENGTH = 3000;

const registerWhiteboardHandlers = (io, socket) => {
  /**
   * Broadcast draw action to all peers in the room (except sender)
   * Payload: { roomId, action: { x0, y0, x1, y1, color, size, isEraser } }
   */
  socket.on('whiteboard-draw', ({ roomId, action }) => {
    if (!roomId || !action) return;

    const cleanRoomId = roomId.trim().toLowerCase();

    if (!whiteboardHistories.has(cleanRoomId)) {
      whiteboardHistories.set(cleanRoomId, []);
    }

    const history = whiteboardHistories.get(cleanRoomId);
    if (history.length < MAX_HISTORY_LENGTH) {
      history.push(action);
    } else {
      history.shift();
      history.push(action);
    }

    // Broadcast only to other users in the room so the drawer doesn't duplicate
    socket.to(`room_${cleanRoomId}`).emit('whiteboard-draw', { action });
  });

  /**
   * Clear canvas
   * Payload: { roomId }
   */
  socket.on('whiteboard-clear', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = roomId.trim().toLowerCase();

    whiteboardHistories.set(cleanRoomId, []);

    // Broadcast clear event to all in the room
    io.to(`room_${cleanRoomId}`).emit('whiteboard-clear');
  });

  /**
   * Newly joined peer requests current whiteboard state
   * Payload: { roomId }
   */
  socket.on('whiteboard-request-state', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = roomId.trim().toLowerCase();

    const history = whiteboardHistories.get(cleanRoomId) || [];
    socket.emit('whiteboard-init-state', { history });
  });
};

module.exports = { registerWhiteboardHandlers, whiteboardHistories };

