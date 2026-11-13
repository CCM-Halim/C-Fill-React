import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { isAdminEmail } from '../config/access';
import { bacaKartuFotoConfig, simpanKartuFoto, hapusKartuFoto, ambilFotoUrl } from '../lib/kartuFoto';

const Ctx = createContext(null);

export function KartuFotoProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const [config, setConfig] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(() => { bacaKartuFotoConfig().then(setConfig); }, []);

  const simpan = useCallback(async (key, file) => { setConfig(await simpanKartuFoto(key, file, config)); setRev((r) => r + 1); }, [config]);
  const hapus = useCallback(async (key) => setConfig(await hapusKartuFoto(key, config)), [config]);

  const value = useMemo(() => ({ config, rev, isAdmin, editMode, setEditMode, simpan, hapus }), [config, rev, isAdmin, editMode, simpan, hapus]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useKartuFoto() {
  return useContext(Ctx) || { config: {}, isAdmin: false, editMode: false, setEditMode() {}, async simpan() {}, async hapus() {} };
}

/** URL foto hasil upload admin untuk daftar key (urutan prioritas). null kalau tidak ada. */
export function useFotoKartuUrl(keys) {
  const { config, rev } = useKartuFoto();
  const daftar = Array.isArray(keys) ? keys : keys ? [keys] : [];
  const fileId = daftar.map((k) => config[k]).find(Boolean) || null;
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let batal = false;
    setUrl(null);
    if (fileId) ambilFotoUrl(fileId).then((u) => { if (!batal) setUrl(u); });
    return () => { batal = true; };
  }, [fileId, rev]);
  return url;
}
