import { createTheme } from '@mui/material/styles';

// Creating a theme with accessible, high-contrast options for seniors
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Bright blue - good contrast
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#388e3c', // Green
      contrastText: '#ffffff',
    },
    error: {
      main: '#d32f2f', // Bright red - easily distinguishable
    },
    background: {
      default: '#f5f5f5', // Light grey background - easier on the eyes
      paper: '#ffffff',
    },
    text: {
      primary: '#212121', // Very dark grey - high contrast against white
      secondary: '#424242', // Dark grey
    },
  },
  typography: {
    fontSize: 16, // Larger base font size
    h1: {
      fontSize: '2.5rem',
    },
    h2: {
      fontSize: '2rem',
    },
    h3: {
      fontSize: '1.75rem',
    },
    body1: {
      fontSize: '1.1rem', // Larger body text
    },
    button: {
      fontSize: '1.1rem', // Larger buttons
      textTransform: 'none', // Don't uppercase button text
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: 16,
        },
      },
    },
  },
});

export default theme;
