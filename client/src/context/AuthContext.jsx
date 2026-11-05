import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('talkme_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('talkme_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate session on initial mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('talkme_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('talkme_user', JSON.stringify(res.user));
          }
        } catch {
          // Token might be invalid or expired; axios interceptor will try refresh or fail
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    if (data.success) {
      setUser(data.user);
      setToken(data.accessToken);
      localStorage.setItem('talkme_token', data.accessToken);
      localStorage.setItem('talkme_user', JSON.stringify(data.user));
    }
    return data;
  };

  const signup = async (username, email, password) => {
    const data = await authApi.signup({ username, email, password });
    if (data.success) {
      setUser(data.user);
      setToken(data.accessToken);
      localStorage.setItem('talkme_token', data.accessToken);
      localStorage.setItem('talkme_user', JSON.stringify(data.user));
    }
    return data;
  };

  const guestLogin = async (guestName) => {
    const data = await authApi.guestLogin(guestName);
    if (data.success) {
      setUser(data.user);
      setToken(data.accessToken);
      localStorage.setItem('talkme_token', data.accessToken);
      localStorage.setItem('talkme_user', JSON.stringify(data.user));
    }
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('talkme_token');
      localStorage.removeItem('talkme_user');
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && !user.isGuest),
    isGuest: Boolean(user?.isGuest),
    loading,
    login,
    signup,
    guestLogin,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

