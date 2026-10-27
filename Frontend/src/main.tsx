import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initFrontendSentry } from './utils/sentry';

initFrontendSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
