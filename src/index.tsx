import { CssBaseline, ThemeProvider } from '@mui/material';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider as CustomThemeProvider, useTheme } from './context/ThemeContext';
import './index.css';
import { darkTheme, lightTheme } from './theme/muiTheme';

// Wrap the entire application with the theme providers
const ThemedApp = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <CustomThemeProvider>
      <ThemedApp />
    </CustomThemeProvider>
  </React.StrictMode>
);

// Report web vitals if available
try {
  const reportWebVitals = require('./reportWebVitals').default;
  if (typeof reportWebVitals === 'function') {
    reportWebVitals(console.log);
  }
} catch (error) {
  console.warn('Web vitals reporting not available');
}
