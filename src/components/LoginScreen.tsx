import { Help, Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import React, { useState } from 'react';
import AccountService from '../services/AccountService';

interface LoginScreenProps {
  onLogin: (password: string) => void;
  isLoading?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isLoading = false }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [logs, setLogs] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.trim() !== '') {
      setLocalLoading(true);
      setError(false);
      
      try {
        await onLogin(password);
      } catch (error) {
        console.error('Login error:', error);
        setError(true);
      } finally {
        setLocalLoading(false);
      }
    } else {
      setError(true);
    }
  };

  const handleShowHelp = async () => {
    setShowHelp(true);
    const logs = await AccountService.getLogs();
    setLogs(logs);
  };

  const handleShowDatabaseFolder = async () => {
    await AccountService.showDatabaseFolder();
  };

  // Use either local or parent loading state
  const loading = isLoading || localLoading;

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh'
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          maxWidth: 500, 
          width: '100%',
          borderRadius: 2
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ mb: 3 }}
        >
          Welcome to Pass+55
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Enter your master password
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            variant="outlined"
            margin="normal"
            label="Master Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            helperText={error ? "Password cannot be empty" : ""}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    aria-label={showPassword ? 'hide password' : 'show password'}
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ mb: 3 }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 2, p: 1.5 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
          </Button>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button
              startIcon={<Help />}
              onClick={handleShowHelp}
              size="small"
              color="info"
            >
              Having trouble? Get help
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Help Dialog */}
      <Dialog 
        open={showHelp} 
        onClose={() => setShowHelp(false)} 
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Troubleshooting Help</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            If you're having trouble logging in:
          </Typography>
          
          <ol>
            <li>
              <Typography paragraph>
                Make sure you're using the correct master password.
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                If you've forgotten your password, there's no recovery method to protect your security.
                You may need to delete the database file and start fresh.
              </Typography>
            </li>
            <li>
              <Typography>
                Check the application logs below for any error messages:
              </Typography>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={handleShowDatabaseFolder}
                sx={{ my: 1 }}
              >
                Open Database Folder
              </Button>
              
              {logs && (
                <Box 
                  sx={{ 
                    mt: 2,
                    p: 2, 
                    bgcolor: 'background.paper', 
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    maxHeight: '300px',
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}
                >
                  {logs}
                </Box>
              )}
            </li>
          </ol>
          
          <Typography variant="subtitle1" sx={{ mt: 3 }}>
            For new users:
          </Typography>
          <Typography>
            If this is your first time using Pass+55, simply enter a secure master password 
            to create your database. This password will be used to encrypt all your stored data,
            so make sure it's something you'll remember but is difficult for others to guess.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelp(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginScreen;
