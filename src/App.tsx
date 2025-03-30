import { Box, Container, Snackbar } from '@mui/material';
import Alert from '@mui/material/Alert';
import { useEffect, useState } from 'react';
import './App.css';
import DatabaseSetupScreen from './components/DatabaseSetupScreen';
import LoginScreen from './components/LoginScreen';
import MainInterface from './components/MainInterface';
import PasswordRecoveryDialog from './components/PasswordRecoveryDialog';
import { ThemeProvider as CustomThemeProvider } from './context/ThemeContext';
import AccountService from './services/AccountService';
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

// Wrap the main app content with theme providers
const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [databaseExists, setDatabaseExists] = useState<boolean | null>(null);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info' as 'info' | 'error' | 'success' | 'warning'
  });

  // Check if database exists on component mount
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const exists = await AccountService.databaseExists();
        setDatabaseExists(exists);
      } catch (error) {
        console.error('Error checking database:', error);
        setNotification({
          open: true,
          message: 'Failed to check if database exists',
          severity: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkDatabase();
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

  const handleLogin = async (password: string) => {
    try {
      setIsLoading(true);
      
      if (!password || password.trim() === '') {
        setNotification({
          open: true,
          message: 'Password cannot be empty',
          severity: 'error'
        });
        setIsLoading(false);
        return;
      }
      
      // Initialize the database with the password
      console.log('Initializing database...');
      const initialized = await AccountService.initialize(password);
      
      if (initialized) {
        console.log('Database initialized, verifying password...');
        // Then verify the password
        const isValid = await AccountService.verifyPassword(password);
        
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
      setDatabaseExists(true);
      
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

  if (isLoading && databaseExists === null) {
    return (
      <Container maxWidth="lg" className="app-container">
        <Box sx={{ my: 4, textAlign: 'center' }}>
          Loading...
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className="app-container">
      <Box sx={{ my: 4 }}>
        {isAuthenticated ? (
          <MainInterface onLogout={handleLogout} />
        ) : databaseExists ? (
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
    </Container>
  );
};

function App() {
  return (
    <CustomThemeProvider>
      <AppContent />
    </CustomThemeProvider>
  );
}

export default App;
