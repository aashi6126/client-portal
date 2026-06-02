import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';

// Send the session cookie with every request.
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [authDisabled, setAuthDisabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/me');
      setUser(data.user || null);
      if (typeof data.login_enabled === 'boolean') {
        setLoginEnabled(data.login_enabled);
      }
      if (typeof data.auth_disabled === 'boolean') {
        setAuthDisabled(data.auth_disabled);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (username, password) => {
    const { data } = await axios.post('/api/login', { username, password });
    setUser(data.user);
    if (typeof data.login_enabled === 'boolean') {
      setLoginEnabled(data.login_enabled);
    }
    return data.user;
  };

  const logout = async () => {
    try {
      await axios.post('/api/logout');
    } catch {
      // ignore — clear local state regardless
    }
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    mustChangePassword: !!user?.must_change_password,
    loginEnabled,
    setLoginEnabled,
    authDisabled,
    login,
    logout,
    refresh: bootstrap,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
