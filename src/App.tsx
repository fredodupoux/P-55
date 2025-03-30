import { Box, Container, Snackbar } from '@mui/material';
import Alert from '@mui/material/Alert';
import { useEffect, useState } from 'react';
import './App.css';
import LoginScreen from './components/LoginScreen';
import MainInterface from './components/MainInterface';
import AccountService from './services/AccountService';
import './types/ElectronAPI'; // Import for type augmentation

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info' as 'info' | 'error' | 'success' | 'warning'
  });

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
      
      // First initialize the database with the password
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
        console.error('Failed to initialize database');
        setNotification({
          open: true,
          message: 'Failed to initialize database. Please check the application logs.',
          severity: 'error'
        });
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

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {isAuthenticated ? (
          <MainInterface onLogout={handleLogout} />
        ) : (
          <LoginScreen onLogin={handleLogin} isLoading={isLoading} />
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
      </Box>
    </Container>
  );
}

export default App;
