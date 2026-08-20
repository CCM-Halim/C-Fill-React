import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconArrowLeft } from './Icons';

/**
 * Tombol "Kembali" global — muncul di semua halaman kecuali Dashboard (root),
 * mundur 1 langkah lewat browser history. Ditaruh 1x di App.jsx supaya
 * konsisten di semua halaman tanpa perlu diulang di tiap page component.
 */
export default function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/') return null;

  return (
    <button className="back-btn" onClick={() => navigate(-1)}>
      <IconArrowLeft /> Kembali
    </button>
  );
}
