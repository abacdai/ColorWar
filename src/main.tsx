import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker safely for offline asset caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('New content available, auto-updating...');
      },
      onOfflineReady() {
        console.log('App ready to work offline with Service Worker');
      },
    });
  } catch (err) {
    console.warn('Service worker registration skipped:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

