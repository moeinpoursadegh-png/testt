import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './styles/site.css';
import App from './App';

// VITE_HASH=1 builds a variant with hash URLs and relative assets, for hosts
// that cannot rewrite paths (single-file previews, file shares).
const hash = import.meta.env.VITE_HASH === '1';
const Router = hash ? HashRouter : BrowserRouter;
const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>
);

// Hydrate only when the server sent the HTML prerendered for this exact route.
// A host that falls back to another page's HTML (or the bare shell) gets a fresh render.
const here = location.pathname.replace(/\/+$/, '') || '/';
if (!hash && root.firstElementChild && root.dataset.path === here) {
  hydrateRoot(root, app);
} else {
  root.textContent = '';
  createRoot(root).render(app);
}
