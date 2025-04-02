import { Box, CssBaseline, Snackbar } from '@mui/material';
import Alert from '@mui/material/Alert';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import './App.css';
import DatabaseSetupScreen from './components/DatabaseSetupScreen';
import LoginScreen from './components/LoginScreen';
import MainInterface from './components/MainInterface';
import PasswordRecoveryDialog from './components/PasswordRecoveryDialog';
import { ThemeContext } from './context/ThemeContext';
import AccountService from './services/AccountService';
import { createTheme } from './theme/muiTheme';
import './types/ElectronAPI'; // Import for type augmentation
import { SecurityQuestion } from './types/SecurityQuestion';

// Security questions list
const securityQuestions: SecurityQuestion[] = [
  { id: 1, question: "What was the name of your first pet?" },
  { id: 2, question: "In what city were you born?" },
  { id: 3, question: "What was the model of your first car?" },
  { id: 4, question: "What was your childhood nickname?" },
  { id: 5, question: "What is your mother's maiden name?" },
  { id: 6, question: "What is the name of your favorite teacher?" },
  { id: 7, question: "What was the name of the street you grew up on?" },
  { id: 8, question: "What was the name of your elementary school?" },
  { id: 9, question: "What is your favorite book?" },
  { id: 10, question: "What is the name of your favorite movie?" }
];

// We don't need to redeclare Window interface here since it's in ElectronAPI.ts

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDatabaseSetup, setIsDatabaseSetup] = useState<boolean | null>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info' as 'info' | 'error' | 'success' | 'warning'
  });

  // Check if dark mode is preferred
  useEffect(() => {
    const savedTheme = localStorage.getItem('themeMode');
    if (savedTheme) {
      setThemeMode(savedTheme as 'light' | 'dark');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeMode('dark');
    }
    
    // Add theme class to document for CSS variables
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  // Check if database exists on load
  useEffect(() => {
    const checkDatabaseExists = async () => {
      try {
        const exists = await AccountService.databaseExists();
        setIsDatabaseSetup(exists);
      } catch (error) {
        console.error('Error checking database:', error);
        setNotification({
          open: true,
          message: 'Failed to check if database exists',
          severity: 'error'
        });
        setIsDatabaseSetup(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkDatabaseExists();
  }, []);

  // Handle auto-lock from Electron main process
  useEffect(() => {
    if (window.api) {
      window.api.receive('lock-application', () => {
        setIsAuthenticated(false);
        setNotification({
          open: true,
          message: 'Session timed out. Please log in again.',
          severity: 'info'
        });
      });
    } else {
      console.log('Running in browser mode - Electron API not available');
    }
  }, []);

  const handleLogin = async (credential: string) => {
    try {
      setIsLoading(true);
      
      if (!credential || credential.trim() === '') {
        setNotification({
          open: true,
          message: 'Credential cannot be empty',
          severity: 'error'
        });
        setIsLoading(false);
        return;
      }
      
      // First attempt to authenticate with the credential
      console.log('Authenticating...');
      const authResult = await AccountService.authenticate(credential);
      
      if (authResult.success) {
        console.log(`Authentication successful using ${authResult.method}`);
        setIsAuthenticated(true);
      } else {
        // If the new authentication method fails, try the legacy initialization method
        // for backward compatibility
        console.log('Authentication failed, trying legacy initialization...');
        const initialized = await AccountService.initialize(credential);
        
        if (initialized) {
          console.log('Database initialized, verifying password...');
          // Then verify the password
          const isValid = await AccountService.verifyPassword(credential);
          
          if (isValid) {
            console.log('Password valid, logging in');
            setIsAuthenticated(true);
          } else {
            console.log('Invalid password');
            setNotification({
              open: true,
              message: 'Invalid master password',
              severity: 'error'
            });
          }
        } else {
          // Check specifically for invalid password instead of generic initialization error
          // This provides a better user experience with more specific error messages
          console.error('Failed to initialize database');
          
          // The initialization may have failed due to an invalid password
          // Let's check if we can detect this specific case
          const lastAttemptWasInvalidPassword = await AccountService.wasLastErrorInvalidPassword();
          
          if (lastAttemptWasInvalidPassword) {
            setNotification({
              open: true,
              message: 'Invalid master password',
              severity: 'error'
            });
          } else {
            setNotification({
              open: true,
              message: 'Failed to initialize database. Please check the application logs.',
              severity: 'error'
            });
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setNotification({
        open: true,
        message: `Login error: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseSetup = async (password: string) => {
    try {
      // The database has been set up in the setup screen
      // Now we just need to log in with the password
      await handleLogin(password);
      
      // Update the database exists state
      setIsDatabaseSetup(true);
      
      setNotification({
        open: true,
        message: 'Database setup complete',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error after database setup:', error);
      setNotification({
        open: true,
        message: 'Failed to complete database setup',
        severity: 'error'
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handlePasswordRecoverySuccess = async (newPassword: string) => {
    setShowPasswordRecovery(false);
    // Log in with the new password
    await handleLogin(newPassword);
    setNotification({
      open: true,
      message: 'Password reset successful',
      severity: 'success'
    });
  };

  const toggleTheme = () => {
    const newTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newTheme);
    localStorage.setItem('themeMode', newTheme);
    document.documentElement.dataset.theme = newTheme;
  };

  // Create theme based on the selected mode
  const theme = createTheme(themeMode);

  // Show loading state while checking if database is set up
  if (isLoading && isDatabaseSetup === null) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          width: '100vw',
          backgroundColor: theme.palette.background.default
        }}
      >
        Loading...
      </Box>
    );
  }

  // Create a custom theme context value
  const themeContextValue = {
    mode: themeMode as 'light' | 'dark' | 'system',
    isDarkMode: themeMode === 'dark',
    setMode: (mode: 'light' | 'dark' | 'system') => {
      setThemeMode(mode === 'system' ? 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
        mode as 'light' | 'dark');
    }
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Box className="App" sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
          {isAuthenticated ? (
            <MainInterface onLogout={handleLogout} />
          ) : isDatabaseSetup ? (
            <LoginScreen 
              onLogin={handleLogin} 
              isLoading={isLoading} 
              onForgotPassword={() => setShowPasswordRecovery(true)}
            />
          ) : (
            <DatabaseSetupScreen 
              onSetupComplete={handleDatabaseSetup}
              securityQuestions={securityQuestions}
            />
          )}
          
          <Snackbar
            open={notification.open}
            autoHideDuration={6000}
            onClose={handleCloseNotification}
          >
            <Alert
              onClose={handleCloseNotification}
              severity={notification.severity}
              sx={{ width: '100%' }}
            >
              {notification.message}
            </Alert>
          </Snackbar>
          
          <PasswordRecoveryDialog
            open={showPasswordRecovery}
            onClose={() => setShowPasswordRecovery(false)}
            onSuccess={handlePasswordRecoverySuccess}
            securityQuestions={securityQuestions}
          />
        </Box>
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;
