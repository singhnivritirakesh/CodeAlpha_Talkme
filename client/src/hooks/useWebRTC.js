import { useState, useRef, useEffect, useCallback } from 'react';
import { rtcPeerConfiguration } from '../utils/rtcConfig';

const CHUNK_SIZE = 32 * 1024; // 32 KB chunk size for WebRTC DataChannel

/**
 * useWebRTC - Full Mesh Topology WebRTC Hook
 * Handles peer connections, signaling negotiation (offer/answer/ICE),
 * track exchange, and WebRTC Data Channels for chunked file sharing.
 */
export const useWebRTC = ({ roomId, socket, localStream, user }) => {
  // Remote streams: { [socketId]: { stream: MediaStream, participant: Object } }
  const [remoteStreams, setRemoteStreams] = useState({});
  // List of active participants: Array<participant>
  const [participants, setParticipants] = useState([]);
  // In-room shared files received via data channels: Array<fileInfo>
  const [sharedFiles, setSharedFiles] = useState([]);
  // Current file transfer progress: { fileName, percent, type: 'upload'|'download' } | null
  const [fileTransferProgress, setFileTransferProgress] = useState(null);

  // References to preserve state across renders without triggering re-renders
  const peersRef = useRef({}); // { [socketId]: RTCPeerConnection }
  const dataChannelsRef = useRef({}); // { [socketId]: RTCDataChannel }
  const candidatesQueueRef = useRef({}); // { [socketId]: Array<RTCIceCandidate> }
  const fileReceiversRef = useRef({}); // { [fileId]: { meta, receivedChunks, receivedSize } }
  const localStreamRef = useRef(localStream);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  /**
   * Helper to set up DataChannel listeners for file transfers
   */
  const setupDataChannelEvents = useCallback((dataChannel, peerSocketId) => {
    dataChannel.binaryType = 'arraybuffer';

    dataChannel.onopen = () => {
      console.log(`[WebRTC DataChannel] Open with peer: ${peerSocketId}`);
    };

    dataChannel.onclose = () => {
      console.log(`[WebRTC DataChannel] Closed with peer: ${peerSocketId}`);
    };

    dataChannel.onerror = (err) => {
      console.error(`[WebRTC DataChannel] Error with peer ${peerSocketId}:`, err);
    };

    dataChannel.onmessage = (event) => {
      handleIncomingDataChannelMessage(event);
    };
  }, []);

  /**
   * Handle incoming DataChannel message (File Metadata or Chunk)
   */
  const handleIncomingDataChannelMessage = (event) => {
    if (typeof event.data === 'string') {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'file-meta') {
          fileReceiversRef.current[message.fileId] = {
            meta: message,
            receivedChunks: [],
            receivedSize: 0
          };
          setFileTransferProgress({
            fileName: message.fileName,
            percent: 0,
            type: 'download'
          });
        }
      } catch (err) {
        console.error('[WebRTC DataChannel] JSON parse error:', err);
      }
    } else if (event.data instanceof ArrayBuffer) {
      // Chunk received: First 36 bytes contains fileId (UUID), followed by raw chunk bytes
      const header = new TextDecoder().decode(event.data.slice(0, 36));
      const fileId = header.trim();
      const chunkData = event.data.slice(36);

      const receiver = fileReceiversRef.current[fileId];
      if (receiver) {
        receiver.receivedChunks.push(chunkData);
        receiver.receivedSize += chunkData.byteLength;

        const percent = Math.min(
          100,
          Math.round((receiver.receivedSize / receiver.meta.fileSize) * 100)
        );

        setFileTransferProgress({
          fileName: receiver.meta.fileName,
          percent,
          type: 'download'
        });

        // Check if download is complete
        if (receiver.receivedSize >= receiver.meta.fileSize) {
          const blob = new Blob(receiver.receivedChunks, { type: receiver.meta.mimeType });
          const downloadUrl = URL.createObjectURL(blob);

          const completedFile = {
            fileId: receiver.meta.fileId,
            fileName: receiver.meta.fileName,
            fileSize: receiver.meta.fileSize,
            mimeType: receiver.meta.mimeType,
            downloadUrl,
            sender: receiver.meta.senderName,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: 'p2p'
          };

          setSharedFiles((prev) => [completedFile, ...prev]);
          setFileTransferProgress(null);
          delete fileReceiversRef.current[fileId];
        }
      }
    }
  };

  /**
   * Create an RTCPeerConnection for a remote peer
   */
  const createPeerConnection = useCallback((peerSocketId, isInitiator = false) => {
    // Return existing peer connection if already present
    if (peersRef.current[peerSocketId]) {
      return peersRef.current[peerSocketId];
    }

    const pc = new RTCPeerConnection(rtcPeerConfiguration);
    peersRef.current[peerSocketId] = pc;
    candidatesQueueRef.current[peerSocketId] = [];

    // Add local stream tracks to the peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE candidate event
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          toSocketId: peerSocketId,
          candidate: event.candidate
        });
      }
    };

    // Remote track received
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams((prev) => ({
        ...prev,
        [peerSocketId]: {
          stream: remoteStream,
          participant: prev[peerSocketId]?.participant || { socketId: peerSocketId }
        }
      }));
    };

    // Connection state debugging
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${peerSocketId} state:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        removePeer(peerSocketId);
      }
    };

    // Data Channel setup
    if (isInitiator) {
      try {
        const dc = pc.createDataChannel('fileTransfer', { ordered: true });
        dataChannelsRef.current[peerSocketId] = dc;
        setupDataChannelEvents(dc, peerSocketId);
      } catch (err) {
        console.error('[WebRTC] Error creating DataChannel:', err);
      }
    } else {
      pc.ondatachannel = (event) => {
        const dc = event.channel;
        dataChannelsRef.current[peerSocketId] = dc;
        setupDataChannelEvents(dc, peerSocketId);
      };
    }

    return pc;
  }, [socket, setupDataChannelEvents]);

  /**
   * Remove a peer connection and clean up resources
   */
  const removePeer = useCallback((peerSocketId) => {
    if (peersRef.current[peerSocketId]) {
      peersRef.current[peerSocketId].close();
      delete peersRef.current[peerSocketId];
    }
    if (dataChannelsRef.current[peerSocketId]) {
      dataChannelsRef.current[peerSocketId].close();
      delete dataChannelsRef.current[peerSocketId];
    }
    delete candidatesQueueRef.current[peerSocketId];

    setRemoteStreams((prev) => {
      const updated = { ...prev };
      delete updated[peerSocketId];
      return updated;
    });

    setParticipants((prev) => prev.filter((p) => p.socketId !== peerSocketId));
  }, []);

  /**
   * Replace video track across all active peer connections
   * (Used when switching between webcam and screen sharing)
   */
  const replaceVideoTrack = useCallback((newVideoTrack) => {
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(newVideoTrack);
      }
    });
  }, []);

  /**
   * Send a file to all peers via WebRTC Data Channels (Chunked Transfer)
   */
  const sendFileP2P = useCallback(async (file) => {
    const activeDataChannels = Object.values(dataChannelsRef.current).filter(
      (dc) => dc.readyState === 'open'
    );

    if (activeDataChannels.length === 0) {
      throw new Error('No active peer data channels available for P2P transfer.');
    }

    // Format fileId fixed to 36 chars
    const fileId = Math.random().toString(36).substring(2, 10).padEnd(36, ' ');

    const metadata = {
      type: 'file-meta',
      fileId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      senderName: user?.username || 'You',
      totalChunks: Math.ceil(file.size / CHUNK_SIZE)
    };

    // 1. Send metadata message
    activeDataChannels.forEach((dc) => {
      dc.send(JSON.stringify(metadata));
    });

    setFileTransferProgress({
      fileName: file.name,
      percent: 0,
      type: 'upload'
    });

    // 2. Read and send chunks
    const buffer = await file.arrayBuffer();
    const totalBytes = buffer.byteLength;
    let offset = 0;

    const headerBytes = new TextEncoder().encode(fileId); // 36 bytes

    while (offset < totalBytes) {
      const chunkSlice = buffer.slice(offset, offset + CHUNK_SIZE);
      const combined = new Uint8Array(36 + chunkSlice.byteLength);
      combined.set(headerBytes, 0);
      combined.set(new Uint8Array(chunkSlice), 36);

      activeDataChannels.forEach((dc) => {
        if (dc.readyState === 'open') {
          // Manage buffer pressure
          if (dc.bufferedAmount > 8 * 1024 * 1024) {
            // Wait briefly if buffer is full
          }
          dc.send(combined.buffer);
        }
      });

      offset += chunkSlice.byteLength;
      const percent = Math.min(100, Math.round((offset / totalBytes) * 100));
      setFileTransferProgress({
        fileName: file.name,
        percent,
        type: 'upload'
      });

      // Yield event loop briefly to prevent freezing UI
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    // Add to local shared files list
    const sentFile = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      downloadUrl: URL.createObjectURL(file),
      sender: 'You',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'p2p'
    };

    setSharedFiles((prev) => [sentFile, ...prev]);
    setFileTransferProgress(null);
  }, [user?.username]);

  /**
   * Main Signaling Event Listeners
   */
  useEffect(() => {
    if (!socket || !roomId) return;

    // 1. Existing participants in room received
    // The newly joined peer creates an offer for each existing participant
    const handleExistingParticipants = async ({ participants: existingList }) => {
      setParticipants(existingList);

      for (const peer of existingList) {
        const peerSocketId = peer.socketId;
        const pc = createPeerConnection(peerSocketId, true);

        // Store peer metadata
        setRemoteStreams((prev) => ({
          ...prev,
          [peerSocketId]: {
            stream: prev[peerSocketId]?.stream || null,
            participant: peer
          }
        }));

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('offer', {
            toSocketId: peerSocketId,
            offer
          });
        } catch (err) {
          console.error(`[WebRTC] Failed to create offer for peer ${peerSocketId}:`, err);
        }
      }
    };

    // 2. A new user joined the room
    const handleUserJoined = ({ participant }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === participant.socketId)) return prev;
        return [...prev, participant];
      });

      setRemoteStreams((prev) => ({
        ...prev,
        [participant.socketId]: {
          stream: prev[participant.socketId]?.stream || null,
          participant
        }
      }));
    };

    // 3. Receive Offer from a peer
    const handleOffer = async ({ fromSocketId, offer, sender }) => {
      const pc = createPeerConnection(fromSocketId, false);

      setRemoteStreams((prev) => ({
        ...prev,
        [fromSocketId]: {
          stream: prev[fromSocketId]?.stream || null,
          participant: sender || prev[fromSocketId]?.participant || { socketId: fromSocketId }
        }
      }));

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Flush any queued ICE candidates for this peer
        if (candidatesQueueRef.current[fromSocketId]) {
          for (const cand of candidatesQueueRef.current[fromSocketId]) {
            await pc.addIceCandidate(cand);
          }
          candidatesQueueRef.current[fromSocketId] = [];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answer', {
          toSocketId: fromSocketId,
          answer
        });
      } catch (err) {
        console.error(`[WebRTC] Failed to handle offer from ${fromSocketId}:`, err);
      }
    };

    // 4. Receive Answer from a peer
    const handleAnswer = async ({ fromSocketId, answer }) => {
      const pc = peersRef.current[fromSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          // Flush queued candidates
          if (candidatesQueueRef.current[fromSocketId]) {
            for (const cand of candidatesQueueRef.current[fromSocketId]) {
              await pc.addIceCandidate(cand);
            }
            candidatesQueueRef.current[fromSocketId] = [];
          }
        } catch (err) {
          console.error(`[WebRTC] Failed to handle answer from ${fromSocketId}:`, err);
        }
      }
    };

    // 5. Receive ICE Candidate from a peer
    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      const pc = peersRef.current[fromSocketId];
      if (candidate) {
        const iceCandidate = new RTCIceCandidate(candidate);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(iceCandidate);
          } catch (err) {
            console.error(`[WebRTC] Error adding ICE candidate from ${fromSocketId}:`, err);
          }
        } else {
          // Remote description not set yet; queue candidate
          if (!candidatesQueueRef.current[fromSocketId]) {
            candidatesQueueRef.current[fromSocketId] = [];
          }
          candidatesQueueRef.current[fromSocketId].push(iceCandidate);
        }
      }
    };

    // 6. Media state changed by a remote peer (audio mute, video toggle, screen share)
    const handleUserMediaStateChanged = ({ socketId, isAudioMuted, isVideoOff, isScreenSharing }) => {
      setRemoteStreams((prev) => {
        if (!prev[socketId]) return prev;
        return {
          ...prev,
          [socketId]: {
            ...prev[socketId],
            participant: {
              ...prev[socketId].participant,
              isAudioMuted,
              isVideoOff,
              isScreenSharing
            }
          }
        };
      });
    };

    // 7. Remote user left the room
    const handleUserLeft = ({ socketId }) => {
      removePeer(socketId);
    };

    // 8. Room participant list sync
    const handleParticipantsUpdate = ({ participants: updatedList }) => {
      setParticipants(updatedList);
    };

    // Register socket listeners
    socket.on('existing-participants', handleExistingParticipants);
    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-media-state-changed', handleUserMediaStateChanged);
    socket.on('user-left', handleUserLeft);
    socket.on('room-participants-update', handleParticipantsUpdate);

    // Emit join-room
    socket.emit('join-room', {
      roomId,
      user
    });

    // Cleanup on unmount or room leave
    return () => {
      socket.off('existing-participants', handleExistingParticipants);
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-media-state-changed', handleUserMediaStateChanged);
      socket.off('user-left', handleUserLeft);
      socket.off('room-participants-update', handleParticipantsUpdate);

      // Close all peer connections
      Object.keys(peersRef.current).forEach((peerSocketId) => {
        removePeer(peerSocketId);
      });

      socket.emit('leave-room');
    };
  }, [socket, roomId, user, createPeerConnection, removePeer]);

  return {
    remoteStreams,
    participants,
    sharedFiles,
    setSharedFiles,
    fileTransferProgress,
    sendFileP2P,
    replaceVideoTrack
  };
};

