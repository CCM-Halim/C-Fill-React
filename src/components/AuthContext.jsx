import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as googleLogin, logout as googleLogout, getCurrentUser } from '../lib/googleAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Cek apakah GIS script sudah termuat; kalau belum, tunggu sebentar.
    const existing = getCurrentUser();
    if (existing) setUser(existing);
  }, []);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const { user } = await googleLogin();
      setUser(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    googleLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login: handleLogin, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
