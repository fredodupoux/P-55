import { Box, CssBaseline, Snackbar } from '@mui/material';
import Alert from '@mui/material/Alert';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import './App.css';
import ActivityMonitor from './components/ActivityMonitor';
import DatabaseSetupScreen from './components/DatabaseSetupScreen';
import LoginScreen from './components/LoginScreen';
import MainInterface from './components/MainInterface';
import PasswordRecoveryDialog from './components/PasswordRecoveryDialog';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import AccountService from './services/AccountService';
import { darkTheme, lightTheme } from './theme/muiTheme';
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

// Create a wrapper component that uses the theme context
const AppContent = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDatabaseSetup, setIsDatabaseSetup] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info' as 'info' | 'error' | 'success' | 'warning'
  });
  const [twoFactorCompletedForSession, setTwoFactorCompletedForSession] = useState(false);

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

  // Update the handleLogin method to accept both password and TOTP code
  const handleLogin = async (credential: string, totpCode?: string) => {
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
      
      // Handle the two-step verification case
      if (totpCode) {
        console.log('Two-step verification: validating password and TOTP code');
        
        // We already initialized the DB with the password in the LoginScreen component
        // Now we need to verify the TOTP code
        const isValid = await AccountService.verifyTOTPCode(totpCode);
        
        if (isValid) {
          console.log('TOTP verification successful for two-step auth');
          setIsAuthenticated(true);
          // Mark that 2FA has been completed for this session
          setTwoFactorCompletedForSession(true);
        } else {
          console.log('Invalid TOTP code in two-step verification');
          setNotification({
            open: true,
            message: 'Invalid verification code',
            severity: 'error'
          });
        }
        
        setIsLoading(false);
        return;
      }
      
      // Handle regular authentication (single factor)
      console.log('Authenticating with single factor...');
      const authResult = await AccountService.authenticate(credential);
      
      if (authResult.success) {
        console.log(`Authentication successful using ${authResult.method}`);
        
        // If this is a TOTP auth, mark 2FA as completed
        if (authResult.method === 'totp') {
          setTwoFactorCompletedForSession(true);
        }
        
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
    // Do not reset twoFactorCompletedForSession here to remember it for the session
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

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {/* Add ActivityMonitor component here to track user activity across the entire app */}
      <ActivityMonitor />
      <Box className="App" sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
        {isAuthenticated ? (
          <MainInterface onLogout={handleLogout} />
        ) : isDatabaseSetup ? (
          <LoginScreen 
            onLogin={handleLogin} 
            isLoading={isLoading} 
            onForgotPassword={() => setShowPasswordRecovery(true)}
            twoFactorCompletedForSession={twoFactorCompletedForSession}
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
  );
};

// Main App component that provides the theme context
function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
