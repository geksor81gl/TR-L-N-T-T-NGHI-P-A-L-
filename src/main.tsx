import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Buffer } from 'buffer';

// Polyfill Buffer for mammoth and other libraries
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
  // @ts-ignore
  window.process = window.process || { env: {} };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
