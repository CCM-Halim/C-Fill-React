import React from 'react';

const common = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconDashboard() {
  return (
    <svg {...common}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function IconClipboard() {
  return (
    <svg {...common}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M8.5 12.5l2 2 4.5-4.5" />
    </svg>
  );
}

export function IconGauge() {
  return (
    <svg {...common}>
      <path d="M12 21a9 9 0 1 0-9-9" />
      <path d="M12 12l4-3.5" />
      <path d="M3 12h1.5M20.5 12H19M6 6l1 1" />
    </svg>
  );
}

export function IconUpload() {
  return (
    <svg {...common}>
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <path d="M12 3v12" />
      <path d="M7.5 7.5L12 3l4.5 4.5" />
    </svg>
  );
}

export function IconLogout() {
  return (
    <svg {...common}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconCheckShield() {
  return (
    <svg {...common}>
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4.5" />
    </svg>
  );
}

export function IconLogInOut() {
  return (
    <svg {...common}>
      <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H9" />
    </svg>
  );
}

export function IconTrackInOut() {
  return (
    <svg {...common}>
      <path d="M4 4v16" />
      <path d="M4 8l16-4v16l-16-4" />
      <circle cx="9" cy="9" r="1" />
    </svg>
  );
}

export function IconArrowLeft() {
  return (
    <svg {...common}>
      <path d="M19 12H5" />
      <path d="M11 18l-6-6 6-6" />
    </svg>
  );
}

export function IconBolt() {
  return (
    <svg {...common} strokeWidth="2">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

