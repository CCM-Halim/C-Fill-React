import React, { createContext, useContext, useState } from 'react';
import { login as googleLogin, logout as googleLogout, getCurrentUser } from '../lib/googleAuth';
import { isForemanEmail } from '../config/foremen';
import { isAllowedEmail } from '../config/access';

const AuthContext = createContext(null);
const ACCESS_DENIED_MESSAGE = 'Akun ini tidak memiliki akses ke aplikasi C-Fill. Hubungi admin untuk didaftarkan.';
// Batas tunggu login: 60 detik. Setelah user pilih akun, GIS masih perlu
// tukar token + fetch userinfo via jaringan — di HP lemot bisa >5 detik,
// jadi timeout pendek justru membunuh login yang sebenarnya berhasil.
const LOGIN_TIMEOUT_MS = 60000;

/** Gerbang akses whitelist */
function enforceAccess(currentUser) {
  if (!currentUser) return null;
  if (isAllowedEmail(currentUser.email)) return currentUser;
  googleLogout();
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => enforceAccess(getCurrentUser()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin() {
    console.log('[CCM Fill] Starting login...');
    setLoading(true);
    setError(null);
    
    // Timeout handler — pengaman kalau popup Google tidak pernah merespons
    // (mis. diblokir browser / user menutup popup). 60 detik cukup untuk
    // jaringan HP paling lemot sekalipun.
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Timeout menunggu Google'));
      }, LOGIN_TIMEOUT_MS);
    });
    
    try {
      // Race between actual login AND timeout-with-fallback
      const result = await Promise.race([
        googleLogin().then(res => {
          console.log('[CCM Fill] googleLogin() succeeded:', res.user?.email);
          return res;
        }),
        timeoutPromise
      ]);
      
      if (!result || !result.user) {
        throw new Error('Google login gagal - tidak ada user returned');
      }
      
      localStorage.setItem('cfill_has_logged_in_before', 'true');
      
      if (!isAllowedEmail(result.user.email)) {
        console.error('[CCM Fill] Access denied:', result.user.email);
        setError(ACCESS_DENIED_MESSAGE);
        googleLogout();
        clearTimeout(timeoutId);
        return;
      }
      
      console.log('[CCM Fill] Setting user:', result.user.email);
      setUser(result.user);
      clearTimeout(timeoutId); // Clear timeout jika berhasil
      setError(null);
    } catch (e) {
      console.error('[CCM Fill] Login error:', e.message);
      setError(e.message);
      googleLogout();
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    console.log('[CCM Fill] Logout clicked');
    googleLogout();
    setUser(null);
    setError(null);
  }

  const isForeman = isForemanEmail(user?.email);

  return (
    <AuthContext.Provider value={{ user, loading, error, checkingSilent: false, login: handleLogin, logout: handleLogout, isForeman }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
