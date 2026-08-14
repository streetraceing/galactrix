import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary';
import { Providers } from './providers';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Providers>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </Providers>
  </React.StrictMode>,
);
