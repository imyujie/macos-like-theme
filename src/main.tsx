import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { appCornerTargets } from './appCorners';
import { installMacCorners } from './theme';
import './demo.css';

const removeCorners = installMacCorners(document.body, appCornerTargets);
window.addEventListener('pagehide', removeCorners, { once: true });
import.meta.hot?.dispose(() => {
  window.removeEventListener('pagehide', removeCorners);
  removeCorners();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
