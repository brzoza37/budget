import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { AppThemeProvider } from './context/ThemeContext';
import App from './App';
import './i18n/index';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
);
