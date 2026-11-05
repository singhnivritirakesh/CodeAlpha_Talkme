import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, Clock, Wifi, ShieldCheck } from 'lucide-react';

export const RoomHeader = ({ roomId, roomTitle, participantCount = 1, isConnected = true }) => {
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Meeting duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyLink = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="h-14 px-4 sm:px-6 glass-panel border-b border-slate-800/80 flex items-center justify-between z-20 shrink-0">
      {/* Room Details & Copy Link */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-slate-100 max-w-[140px] sm:max-w-xs truncate">
            {roomTitle || `Meeting ${roomId}`}
          </h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            {roomId}
          </span>
        </div>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all"
          title="Copy meeting link to share"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy Link</span>
            </>
          )}
        </button>
      </div>

      {/* Status & Stats */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        {/* Security badge */}
        <div className="hidden md:flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>E2E DTLS-SRTP</span>
        </div>

        {/* Meeting Timer */}
        <div className="flex items-center gap-1.5 font-mono bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>{formatDuration(elapsedSeconds)}</span>
        </div>

        {/* Participant Count */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>{participantCount}</span>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="hidden lg:inline text-[11px] text-slate-400">
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
      </div>
    </div>
  );
};

