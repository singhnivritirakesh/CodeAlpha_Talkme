import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useMediaDevices } from '../hooks/useMediaDevices';
import { useWebRTC } from '../hooks/useWebRTC';
import { roomApi } from '../api/roomApi';

import { RoomHeader } from '../components/room/RoomHeader';
import { VideoGrid } from '../components/room/VideoGrid';
import { ControlsBar } from '../components/room/ControlsBar';
import { ChatDrawer } from '../components/room/ChatDrawer';
import { WhiteboardModal } from '../components/room/WhiteboardModal';
import { FileTransferModal } from '../components/room/FileTransferModal';
import { ParticipantsModal } from '../components/room/ParticipantsModal';

export const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [roomData, setRoomData] = useState(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState('');

  // Modals & Drawers state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isFileShareOpen, setIsFileShareOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // In-room chat messages state
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 1. Media devices hook (camera, microphone, screen sharing)
  const {
    localStream,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    mediaError,
    startLocalMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    stopAllMedia
  } = useMediaDevices();

  // 2. WebRTC Mesh Hook
  const {
    remoteStreams,
    participants,
    sharedFiles,
    setSharedFiles,
    fileTransferProgress,
    sendFileP2P,
    replaceVideoTrack
  } = useWebRTC({
    roomId,
    socket,
    localStream,
    user
  });

  // Verify and fetch room metadata
  useEffect(() => {
    let isMounted = true;
    const fetchRoom = async () => {
      try {
        setIsLoadingRoom(true);
        const res = await roomApi.getRoom(roomId);
        if (isMounted && res.success) {
          setRoomData(res.room);
        }
      } catch (err) {
        if (isMounted) {
          setRoomError(err.response?.data?.message || 'Failed to load room details.');
        }
      } finally {
        if (isMounted) setIsLoadingRoom(false);
      }
    };

    fetchRoom();
    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // Request initial camera and microphone on room load
  useEffect(() => {
    startLocalMedia();
  }, [startLocalMedia]);

  // Notify peers via Socket.io when local media state changes
  useEffect(() => {
    if (socket && roomId) {
      socket.emit('media-state-change', {
        roomId,
        isAudioMuted,
        isVideoOff,
        isScreenSharing
      });
    }
  }, [socket, roomId, isAudioMuted, isVideoOff, isScreenSharing]);

  // Handle in-room chat messages and system alerts
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!isChatOpen) {
        setUnreadCount((c) => c + 1);
      }
    };

    const handleUserJoinedSystem = ({ participant }) => {
      const systemMsg = {
        id: `sys_join_${Date.now()}`,
        isSystem: true,
        text: `${participant.username || 'A user'} joined the meeting`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, systemMsg]);
    };

    const handleUserLeftSystem = ({ participant }) => {
      const systemMsg = {
        id: `sys_leave_${Date.now()}`,
        isSystem: true,
        text: `${participant?.username || 'A participant'} left the meeting`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, systemMsg]);
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-joined', handleUserJoinedSystem);
    socket.on('user-left', handleUserLeftSystem);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-joined', handleUserJoinedSystem);
      socket.off('user-left', handleUserLeftSystem);
    };
  }, [socket, isChatOpen]);

  // Clear unread count when opening chat drawer
  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  };

  const handleSendMessage = (text) => {
    if (socket && roomId) {
      socket.emit('send-message', {
        roomId,
        text
      });
    }
  };

  // Screen sharing toggle handler
  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare((webcamTrack) => {
        replaceVideoTrack(webcamTrack);
      });
    } else {
      startScreenShare((screenTrack) => {
        replaceVideoTrack(screenTrack);
      });
    }
  };

  // Leave meeting handler
  const handleLeaveCall = () => {
    stopAllMedia();
    navigate('/');
  };

  if (isLoadingRoom) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs font-semibold">Connecting to room...</p>
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel rounded-3xl p-6 text-center border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Unable to Join Room</h2>
          <p className="text-xs text-slate-400">{roomError}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const allParticipantsList = [
    {
      socketId: 'local',
      userId: user?.id || user?._id || 'local',
      username: user?.username || 'You',
      avatar: user?.avatar,
      isGuest: user?.isGuest,
      isAudioMuted,
      isVideoOff,
      isScreenSharing
    },
    ...participants
  ];

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden select-none">
      {/* Room Header */}
      <RoomHeader
        roomId={roomId}
        roomTitle={roomData?.title}
        participantCount={allParticipantsList.length}
        isConnected={isConnected}
      />

      {/* Media Permission Warning Banner if device denied */}
      {mediaError && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Camera/Microphone access was blocked or unavailable. Joining in listening mode.</span>
          </div>
          <button
            onClick={() => startLocalMedia()}
            className="flex items-center gap-1 font-semibold underline hover:text-white"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Conference Content: Video Grid + Optional Chat Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        <VideoGrid
          localStream={localStream}
          user={user}
          isAudioMuted={isAudioMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          remoteStreams={remoteStreams}
        />

        {/* In-Room Text Chat Drawer */}
        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={messages}
          onSendMessage={handleSendMessage}
          currentUserId={user?.id || user?._id}
        />
      </div>

      {/* Bottom Controls Bar */}
      <ControlsBar
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isWhiteboardOpen={isWhiteboardOpen}
        isFileShareOpen={isFileShareOpen}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        unreadCount={unreadCount}
        participantCount={allParticipantsList.length}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleWhiteboard={() => setIsWhiteboardOpen((prev) => !prev)}
        onToggleFileShare={() => setIsFileShareOpen((prev) => !prev)}
        onToggleChat={handleToggleChat}
        onToggleParticipants={() => setIsParticipantsOpen((prev) => !prev)}
        onLeaveCall={() => setShowLeaveConfirm(true)}
      />

      {/* Collaborative Whiteboard Modal */}
      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        socket={socket}
        roomId={roomId}
      />

      {/* File Sharing Modal */}
      <FileTransferModal
        isOpen={isFileShareOpen}
        onClose={() => setIsFileShareOpen(false)}
        sendFileP2P={sendFileP2P}
        sharedFiles={sharedFiles}
        setSharedFiles={setSharedFiles}
        fileTransferProgress={fileTransferProgress}
        roomId={roomId}
        currentUserName={user?.username}
      />

      {/* Participants List Modal */}
      <ParticipantsModal
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        participants={allParticipantsList}
        currentUserId={user?.id || user?._id}
        roomId={roomId}
      />

      {/* Leave Call Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel rounded-3xl p-6 text-center border border-slate-700/80 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">Leave Meeting?</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to disconnect from this conference?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                Stay
              </button>
              <button
                onClick={handleLeaveCall}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md shadow-rose-600/30 transition-all"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

