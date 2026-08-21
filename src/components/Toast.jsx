import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, isError = false, linkUrl = null, linkLabel = 'Buka file →') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, isError, linkUrl, linkLabel }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, linkUrl ? 12000 : 4500); // toast dengan link ditampilkan lebih lama, biar sempat diklik
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast">
        {toasts.map((t) => (
          <div key={t.id} className={'toast-item' + (t.isError ? ' error' : '')}>
            <div>{t.message}</div>
            {t.linkUrl ? (
              <a href={t.linkUrl} target="_blank" rel="noreferrer" className="toast-link">
                {t.linkLabel}
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
