import React, { createContext, useContext, useState } from 'react';
import { login as googleLogin, logout as googleLogout, getCurrentUser } from '../lib/googleAuth';
import { isForemanEmail } from '../config/foremen';
import { isAllowedEmail } from '../config/access';

const AuthContext = createContext(null);

// Pesan seragam untuk akun yang tidak ada di daftar izin (config/access.js).
const ACCESS_DENIED_MESSAGE =
  'Akun ini tidak memiliki akses ke aplikasi C-Fill. ' +
  'Hubungi admin untuk didaftarkan.';

/**
 * Gerbang akses: hanya email di daftar ALLOWED_EMAILS (foremen.js +
 * EXTRA_ALLOWED_EMAILS di config/access.js) yang boleh masuk. Kalau ditolak,
 * sesi Google-nya sekalian di-logout supaya tidak nyangkut (kalau tidak,
 * restoreSession di googleAuth.js akan memulihkan user terblokir itu lagi
 * setiap halaman dibuka — jadi blokirnya harus disertai logout).
 */
function enforceAccess(currentUser) {
  if (!currentUser) return null;
  if (isAllowedEmail(currentUser.email)) return currentUser;
  googleLogout();
  return null;
}

export function AuthProvider({ children }) {
  // Sesi sudah di-restore oleh googleAuth.js via sessionStorage sebelum React render
  const [user, setUser] = useState(() => enforceAccess(getCurrentUser()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin() {
    console.log('✅ AUTH CONTEXT: handleLogin called');
    setLoading(true);
    setError(null);
    
    try {
      console.log('AUTH CONTEXT: Calling googleLogin()...');
      const result = await googleLogin();
      console.log('✅ AUTH CONTEXT: googleLogin() resolved:', result);
      
      if (!result || !result.user) {
        throw new Error('googleLogin returned no user');
      }
      
      localStorage.setItem('cfill_has_logged_in_before', 'true');
      
      // Cek akses di sini — kalau tidak diizinkan, logout Google session-nya
      if (!isAllowedEmail(result.user.email)) {
        console.error('❌ AUTH CONTEXT: Access denied for', result.user.email);
        setError(ACCESS_DENIED_MESSAGE);
        googleLogout(); // sekalian clear sesi agar tidak restore lagi
        return; // jangan set user
      }
      
      console.log('✅ AUTH CONTEXT: Setting user to:', result.user);
      setUser(result.user);
    } catch (e) {
      console.error('❌ AUTH CONTEXT: Login error:', e.message || e);
      // Login failed - show actual error message
      setError(e.message || 'Login gagal.');
      googleLogout(); // clear bad session
    } finally {
      console.log('✅ AUTH CONTEXT: Loading complete');
      setLoading(false);
    }
  }

  function handleLogout() {
    googleLogout();
    setUser(null);
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
