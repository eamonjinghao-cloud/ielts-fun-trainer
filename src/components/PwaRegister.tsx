'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          () => console.log('📱 PWA Service Worker registered'),
          (err) => console.log('SW registration failed:', err)
        );
      });
    }
  }, []);

  return null;
}
