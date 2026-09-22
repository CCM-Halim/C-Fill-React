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
    console.log('[CCM Fill] Starting login...');
    setLoading(true);
    setError(null);
    
    // Lebih robust: gunakan Promise.race + timeout 30s
    try {
      console.log('[CCM Fill] Calling googleLogin()...');
      
      const result = await Promise.race([
        googleLogin(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout menunggu Google — silakan refresh dan coba lagi')), 30000)
        )
      ]);
      
      console.log('[CCM Fill] Login resolved:', result?.user?.email);
      
      if (!result || !result.user) {
        throw new Error('Google login gagal - tidak ada data user');
      }
      
      localStorage.setItem('cfill_has_logged_in_before', 'true');
      
      if (!isAllowedEmail(result.user.email)) {
        console.error('[CCM Fill] Access denied:', result.user.email);
        setError(ACCESS_DENIED_MESSAGE);
        googleLogout();
        return;
      }
      
      console.log('[CCM Fill] Setting user:', result.user.email);
      setUser(result.user);
      setError(null); // Clear any previous errors
    } catch (e) {
      console.error('[CCM Fill] Login error:', e.message);
      setError(e.message);
      googleLogout(); // Clean up failed session
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
