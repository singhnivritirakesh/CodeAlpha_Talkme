import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Monitor, Pin, PinOff, User } from 'lucide-react';

export const VideoTile = ({
  stream,
  participant,
  isLocal = false,
  isAudioMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  isPinned = false,
  onTogglePin
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const displayName = isLocal ? `${participant?.username || 'You'} (You)` : participant?.username || 'Participant';
  const avatarUrl = participant?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(participant?.username || 'user')}`;

  return (
    <div
      className={`relative w-full h-full min-h-[180px] bg-slate-900/90 rounded-2xl overflow-hidden border transition-all duration-200 group flex items-center justify-center ${
        isPinned ? 'border-indigo-500 shadow-xl shadow-indigo-500/10' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Local video must be muted to avoid acoustic feedback loop
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isVideoOff ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'
        } ${isLocal && !isScreenSharing ? '-scale-x-100' : ''}`} // Mirror local webcam only
      />

      {/* Avatar Fallback when Camera is Off */}
      {isVideoOff && (
        <div className="flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800 border-2 border-slate-700 p-1 flex items-center justify-center shadow-lg">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full rounded-full object-cover bg-indigo-950/40"
              />
            </div>
            {!isAudioMuted && (
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow">
                <Mic className="w-3.5 h-3.5 text-white" />
              </span>
            )}
          </div>
          <span className="mt-3 font-semibold text-sm text-slate-200">{displayName}</span>
          <span className="text-xs text-slate-500">Camera is turned off</span>
        </div>
      )}

      {/* Screen Sharing Badge */}
      {isScreenSharing && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/90 text-white text-xs font-semibold backdrop-blur-md shadow-md">
          <Monitor className="w-3.5 h-3.5 animate-pulse" />
          <span>Presenting</span>
        </div>
      )}

      {/* Pin / Spotlight Button */}
      {onTogglePin && (
        <button
          onClick={onTogglePin}
          title={isPinned ? 'Unpin video' : 'Pin to spotlight'}
          className={`absolute top-3 right-3 z-10 p-2 rounded-xl backdrop-blur-md transition-all ${
            isPinned
              ? 'bg-indigo-600 text-white opacity-100'
              : 'bg-slate-900/70 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
        >
          {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
        </button>
      )}

      {/* Bottom Overlay Info Tag */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 backdrop-blur-md border border-slate-800/80 text-xs font-medium text-slate-200 shadow-md">
          <span className="truncate max-w-[130px] sm:max-w-[180px]">{displayName}</span>
        </div>

        {/* Audio Mute Status */}
        <div
          className={`p-1.5 rounded-xl backdrop-blur-md border shadow-md ${
            isAudioMuted
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              : 'bg-slate-950/70 text-emerald-400 border-slate-800/80'
          }`}
        >
          {isAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );
};

