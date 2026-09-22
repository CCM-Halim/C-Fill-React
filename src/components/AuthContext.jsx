import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as googleLogin, logout as googleLogout, getCurrentUser, silentLogin, hasLoggedInBefore } from '../lib/googleAuth';
import { isForemanEmail } from '../config/foremen';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Lazy initializer (bukan useState(null) + useEffect) - biar sesi yang udah
  // dipulihkan googleAuth.js (saat module itu dimuat, sebelum React sempat
  // render apapun) langsung kepakai di render PERTAMA. Kalau pakai useEffect,
  // ada jeda sekilas nampilin layar login dulu baru "berkedip" ke halaman
  // asli begitu efeknya jalan.
  const [user, setUser] = useState(() => getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Cuma nunggu proses silent-check kalau MEMANG akan dicoba (device ini
  // pernah login sebelumnya) - kalau user baru, checkingSilent langsung false
  // dari awal (tidak ada apapun buat ditunggu, halaman login muncul langsung).
  const [checkingSilent, setCheckingSilent] = useState(!getCurrentUser() && hasLoggedInBefore());

  // Kalau nggak ada sesi valid tersimpan (mis. access token udah kedaluwarsa -
  // token Google cuma tahan ~1 jam, sedangkan sessionStorage bertahan sampai
  // tab ditutup) DAN device ini PERNAH login sebelumnya, coba SILENT LOGIN
  // dulu di background - manfaatin sesi Google browser yang mungkin masih
  // aktif + consent yang udah pernah diberikan, biar teknisi nggak perlu klik
  // tombol login manual tiap kali refresh setelah >1 jam.
  //
  // PENTING: untuk user yang BELUM PERNAH login sama sekali di device ini,
  // silentLogin() SENGAJA TIDAK dicoba - itu yang sebelumnya bikin popup
  // Google muncul sendiri begitu halaman dibuka, sebelum user sempat klik
  // apapun (nggak semestinya kejadian buat first-time user).
  useEffect(() => {
    if (user || !hasLoggedInBefore()) { setCheckingSilent(false); return; }
    let cancelled = false;
    silentLogin().then((result) => {
      if (cancelled) return;
      if (result?.user) setUser(result.user);
      setCheckingSilent(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const isForeman = isForemanEmail(user?.email);

  return (
    <AuthContext.Provider value={{ user, loading, error, checkingSilent, login: handleLogin, logout: handleLogout, isForeman }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
