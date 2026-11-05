import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Video, ShieldCheck } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { useAuth } from '../context/AuthContext';

export const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { guestLogin } = useAuth();

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');

  const redirectUrl = searchParams.get('redirect') ? decodeURIComponent(searchParams.get('redirect')) : '/';

  const handleSuccess = () => {
    navigate(redirectUrl);
  };

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    const name = guestName.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await guestLogin(name);
      navigate(redirectUrl);
    } catch (err) {
      console.error('Guest login failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-transparent blur-[120px] rounded-full pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 text-center z-10">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            Talkme
          </span>
        </Link>
        <p className="text-xs text-slate-400 mt-1">Sign in to your account or continue as guest</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 z-10 animate-fade-in">
        {/* Tab switch */}
        <div className="flex p-1 bg-slate-900 rounded-2xl border border-slate-800 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              !isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form View */}
        {isLogin ? (
          <LoginForm
            onSuccess={handleSuccess}
            onGuestClick={() => setShowGuestModal(true)}
          />
        ) : (
          <SignupForm onSuccess={handleSuccess} />
        )}

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted with WebRTC DTLS-SRTP &amp; JWT</span>
        </div>
      </div>

      {/* Guest Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm glass-panel rounded-3xl p-6 shadow-2xl border border-slate-700/80">
            <h3 className="text-base font-bold text-slate-100 mb-1">Guest Quick Access</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your display name to start or join right away without creating an account.
            </p>
            <form onSubmit={handleGuestSubmit} className="space-y-3">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Display Name (e.g. Jordan)"
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
                  Join Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

