import React, { createContext, useContext, useState } from 'react';
import { login as googleLogin, logout as googleLogout, getCurrentUser } from '../lib/googleAuth';
import { isForemanEmail } from '../config/foremen';
import { isAllowedEmail } from '../config/access';

const AuthContext = createContext(null);
const ACCESS_DENIED_MESSAGE = 'Akun ini tidak memiliki akses ke aplikasi C-Fill. Hubungi admin untuk didaftarkan.';

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
    setLoading(true);
    setError(null);
    
    // Timeout handler - kalau hang > 30 detik, stop otomatis
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setError('Waktu habis. Coba login ulang.');
      setLoading(false);
    }, 30000);
    
    try {
      const result = await Promise.race([
        googleLogin(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout menunggu Google')), 30000)
        )
      ]);
      
      clearTimeout(timeoutId);
      
      if (!result || !result.user) {
        throw new Error('Google login gagal - tidak ada user returned');
      }
      
      localStorage.setItem('cfill_has_logged_in_before', 'true');
      
      if (!isAllowedEmail(result.user.email)) {
        setError(ACCESS_DENIED_MESSAGE);
        googleLogout();
        clearTimeout(timeoutId);
        return;
      }
      
      setUser(result.user);
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('[CCM Fill] Login error:', e.message);
      setError(e.message || 'Login gagal.');
      googleLogout();
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
