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
    
    // Timeout handler
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        // Fallback: cek apakah Google auth sudah selesai tapi promise tidak resolve
        const restoredUser = getCurrentUser();
        console.log('[CCM Fill] TIMEOUT! Checking sessionStorage for restored user:', restoredUser?.email || 'none');
        
        if (restoredUser && isAllowedEmail(restoredUser.email)) {
          console.log('[CCM Fill] User already in session! Using it directly.');
          setUser(restoredUser);
          localStorage.setItem('cfill_has_logged_in_before', 'true');
          clearTimeout(timeoutId);
          setLoading(false);
          return; // EXIT EARLY
        }
        
        reject(new Error('Timeout menunggu Google'));
      }, 5000); // Kurangi ke 5s saja karena kalau sukses, user akan auto-restored
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
