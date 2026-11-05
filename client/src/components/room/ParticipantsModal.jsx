import React from 'react';
import { X, Users, Mic, MicOff, Video, VideoOff, Monitor, Shield, Copy, Check } from 'lucide-react';

export const ParticipantsModal = ({
  isOpen,
  onClose,
  participants = [],
  currentUserId,
  roomId
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl flex flex-col shadow-2xl border border-slate-700/80 overflow-hidden max-h-[80vh]">
        {/* Header */}
        <div className="h-14 px-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h2 className="font-bold text-sm text-slate-100">
              Participants ({participants.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="p-5 overflow-y-auto space-y-2 flex-1">
          {participants.map((p, idx) => {
            const isSelf = p.userId === currentUserId || p.socketId === 'local';
            const avatar = p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username || idx}`;

            return (
              <div
                key={p.socketId || idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={avatar}
                    alt={p.username}
                    className="w-8 h-8 rounded-full bg-slate-800 object-cover border border-slate-700"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-200 truncate max-w-[140px]">
                        {p.username}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded-full">
                          You
                        </span>
                      )}
                      {p.isGuest && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded-full">
                          Guest
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Media Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  {p.isScreenSharing && (
                    <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-400" title="Sharing screen">
                      <Monitor className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span
                    className={`p-1 rounded-md ${
                      p.isAudioMuted
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                    title={p.isAudioMuted ? 'Muted' : 'Speaking'}
                  >
                    {p.isAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </span>
                  <span
                    className={`p-1 rounded-md ${
                      p.isVideoOff
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                    }`}
                    title={p.isVideoOff ? 'Video off' : 'Video on'}
                  >
                    {p.isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Invite Button */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[11px] truncate max-w-[200px]">
            Room: {roomId}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Invite Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

