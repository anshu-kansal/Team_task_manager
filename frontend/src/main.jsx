import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

// Device-detection fallback: toggles `.is-mobile` on document.body
// This is a non-invasive helper that doesn't replace CSS media queries;
// it only provides a JS-visible flag for edge cases where a script needs
// to know whether the viewport is mobile-sized.
function setDeviceClass() {
  try {
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
    document.body.classList.toggle('is-mobile', Boolean(isMobile));
  } catch (e) {
    // ignore (e.g., server-side rendering environments)
  }
}

setDeviceClass();
let __resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(__resizeTimer);
  __resizeTimer = setTimeout(setDeviceClass, 150);
});

window.addEventListener('orientationchange', () => setTimeout(setDeviceClass, 150));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
