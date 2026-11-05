import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Plus,
  ArrowRight,
  Shield,
  Edit3,
  Monitor,
  Share2,
  Lock,
  Zap,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roomApi } from '../api/roomApi';
import { Navbar } from '../components/layout/Navbar';

export const HomePage = () => {
  const { user, guestLogin } = useAuth();
  const navigate = useNavigate();

  const [meetingCode, setMeetingCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 'create' or code string

  const handleCreateMeeting = async () => {
    if (!user) {
      setPendingAction('create');
      setShowGuestModal(true);
      return;
    }

    try {
      setIsCreating(true);
      const res = await roomApi.createRoom({ title: `${user.username}'s Meeting` });
      if (res.success && res.room) {
        navigate(`/room/${res.room.roomId}`);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    const cleanCode = meetingCode.trim().toLowerCase();
    if (!cleanCode) return;

    if (!user) {
      setPendingAction(cleanCode);
      setShowGuestModal(true);
      return;
    }

    navigate(`/room/${cleanCode}`);
  };

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    const name = guestName.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await guestLogin(name);
      setShowGuestModal(false);

      if (pendingAction === 'create') {
        const res = await roomApi.createRoom({ title: `${name}'s Meeting` });
        if (res.success && res.room) {
          navigate(`/room/${res.room.roomId}`);
        }
      } else if (pendingAction) {
        navigate(`/room/${pendingAction}`);
      }
    } catch (err) {
      console.error('Guest login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-20 relative overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-transparent blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Generation Real-Time Mesh WebRTC</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
            Instant video meetings &amp;{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              live collaboration
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed">
            Ultra-fast peer-to-peer video conferencing, real-time interactive whiteboard, screen sharing, and WebRTC data-channel file transfers — built for effortless teamwork.
          </p>

          {/* Action Hub */}
          <div className="max-w-md mx-auto pt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleCreateMeeting}
              disabled={isCreating}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shrink-0"
            >
              {isCreating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>New Meeting</span>
                </>
              )}
            </button>

            {/* Join Code Input Form */}
            <form onSubmit={handleJoinByCode} className="w-full flex items-center gap-2">
              <input
                type="text"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                placeholder="Enter meeting code"
                className="w-full py-3.5 px-4 bg-slate-900/90 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
              <button
                type="submit"
                disabled={!meetingCode.trim()}
                className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition-all shrink-0"
                title="Join room"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Trust Highlights */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-2xl glass-card">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2.5">
                <Video className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-xs text-slate-200">Mesh WebRTC</h3>
              <p className="text-[11px] text-slate-400 mt-1">Direct low-latency P2P mesh for 4–6 participants.</p>
            </div>

            <div className="p-4 rounded-2xl glass-card">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2.5">
                <Edit3 className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-xs text-slate-200">Live Whiteboard</h3>
              <p className="text-[11px] text-slate-400 mt-1">Freehand drawing, shapes & live sync via Socket.io.</p>
            </div>

            <div className="p-4 rounded-2xl glass-card">
              <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-2.5">
                <Share2 className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-xs text-slate-200">P2P File Transfer</h3>
              <p className="text-[11px] text-slate-400 mt-1">DataChannel chunked sharing up to 50MB with progress.</p>
            </div>

            <div className="p-4 rounded-2xl glass-card">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-xs text-slate-200">DTLS-SRTP Security</h3>
              <p className="text-[11px] text-slate-400 mt-1">Encrypted media, JWT authentication & rate limiting.</p>
            </div>
          </div>
        </div>

        {/* Guest Name Modal */}
        {showGuestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm glass-panel rounded-3xl p-6 shadow-2xl border border-slate-700/80">
              <h3 className="text-base font-bold text-slate-100 mb-1">Join as Guest</h3>
              <p className="text-xs text-slate-400 mb-4">
                Enter your display name to start or join the call immediately.
              </p>
              <form onSubmit={handleGuestSubmit} className="space-y-3">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your Name (e.g. Alex)"
                  autoFocus
                  required
                  className="w-full py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGuestModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all"
                  >
                    Continue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

