import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket connection errors in the development environment
if (process.env.NODE_ENV !== 'production') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('WebSocket')) {
      event.preventDefault();
    }
  });
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('WebSocket')) {
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
