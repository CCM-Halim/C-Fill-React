import React from 'react';
import { useKartuFoto } from './KartuFotoContext';

/** Tombol "Kelola Kartu" (khusus admin) - menyalakan mode upload foto di kartu. */
export default function KelolaKartuButton() {
  const { isAdmin, editMode, setEditMode } = useKartuFoto();
  if (!isAdmin) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
      <button className={`btn btn-small ${editMode ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEditMode(!editMode)}>
        {editMode ? '✓ Selesai Kelola Kartu' : '⚙️ Kelola Kartu'}
      </button>
    </div>
  );
}
