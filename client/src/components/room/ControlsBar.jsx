import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Edit3,
  Paperclip,
  MessageSquare,
  Users,
  PhoneOff
} from 'lucide-react';

export const ControlsBar = ({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  isWhiteboardOpen,
  isFileShareOpen,
  isChatOpen,
  isParticipantsOpen,
  unreadCount = 0,
  participantCount = 1,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleWhiteboard,
  onToggleFileShare,
  onToggleChat,
  onToggleParticipants,
  onLeaveCall
}) => {
  return (
    <footer className="h-20 px-4 sm:px-6 glass-panel border-t border-slate-800/80 flex items-center justify-center z-30 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 max-w-2xl">
        {/* Microphone Toggle */}
        <button
          onClick={onToggleAudio}
          title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-center transition-all ${
            isAudioMuted
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 shadow-lg shadow-rose-500/10'
              : 'bg-slate-800 text-slate-200 border border-slate-700/80 hover:bg-slate-700'
          }`}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={onToggleVideo}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-center transition-all ${
            isVideoOff
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 shadow-lg shadow-rose-500/10'
              : 'bg-slate-800 text-slate-200 border border-slate-700/80 hover:bg-slate-700'
          }`}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-indigo-400" />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop sharing screen' : 'Share your screen'}
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-center transition-all ${
            isScreenSharing
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800 text-slate-200 border border-slate-700/80 hover:bg-slate-700'
          }`}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>

        <div className="h-8 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Collaborative Whiteboard */}
        <button
          onClick={onToggleWhiteboard}
          title="Collaborative Whiteboard"
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-center transition-all ${
            isWhiteboardOpen
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800 text-slate-200 border border-slate-700/80 hover:bg-slate-700'
          }`}
        >
          <Edit3 className="w-5 h-5" />
        </button>

        {/* File Sharing */}
        <button
          onClick={onToggleFileShare}
          title="Share files (P2P WebRTC / Upload)"
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-center transition-all ${
            isFileShareOpen
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800 text-slate-200 border border-slate-700/80 hover:bg-slate-700'
          }`}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* In-Room Text Chat */}
        <button
          onClick={onToggleChat}
          title="In-room Chat"
          className={`relative p-3.5 sm:p-4 rounded-2xl flex items-center justify-center transition-all ${
            isChatOpen
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800 text-slate-200 border border-slate-700/80 hover:bg-slate-700'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Participants List */}
        <button
          onClick={onToggleParticipants}
          title="Participants list"
          className={`relative p-3.5 sm:p-4 rounded-2xl hidden sm:flex items-center justify-center transition-all ${
            isParticipantsOpen
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800 text-slate-200 border border-slate-700/80 hover:bg-slate-700'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-mono rounded-full">
            {participantCount}
          </span>
        </button>

        <div className="h-8 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Leave Call */}
        <button
          onClick={onLeaveCall}
          title="Leave meeting"
          className="p-3.5 sm:p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/30 flex items-center justify-center transition-all group"
        >
          <PhoneOff className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    </footer>
  );
};

