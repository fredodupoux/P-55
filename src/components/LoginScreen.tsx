import { Help, Security, Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Alert,
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
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import AccountService from '../services/AccountService';

interface LoginScreenProps {
  onLogin: (password: string) => void;
  isLoading?: boolean;
  onForgotPassword: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`login-tabpanel-${index}`}
      aria-labelledby={`login-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  isLoading = false,
  onForgotPassword
}) => {
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [logs, setLogs] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [isTotpEnabled, setIsTotpEnabled] = useState(false);
  
  // Check if TOTP is enabled when component mounts
  useEffect(() => {
    const checkTotpStatus = async () => {
      try {
        const settings = await AccountService.getTOTPSettings();
        setIsTotpEnabled(settings?.enabled || false);
      } catch (err) {
        console.error('Error checking TOTP status:', err);
      }
    };
    
    checkTotpStatus();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Clear errors when switching tabs
    setPasswordError(null);
    setTotpError(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.trim() === '') {
      setPasswordError('Password cannot be empty');
      return;
    }
    
    setLocalLoading(true);
    setPasswordError(null);
    
    try {
      await onLogin(password);
    } catch (error) {
      console.error('Login error:', error);
      setPasswordError('Invalid master password');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totpCode.trim() === '' || !/^\d{6,9}$/.test(totpCode)) {
      setTotpError('Please enter a valid verification code');
      return;
    }
    
    setLocalLoading(true);
    setTotpError(null);
    
    try {
      // Use the same onLogin handler but with the TOTP code
      await onLogin(totpCode);
    } catch (error) {
      console.error('TOTP login error:', error);
      setTotpError('Invalid verification code');
    } finally {
      setLocalLoading(false);
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
        
        {isTotpEnabled && (
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            centered
            aria-label="login method tabs"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Password" id="login-tab-0" aria-controls="login-tabpanel-0" />
            <Tab 
              label="Verification Code" 
              id="login-tab-1" 
              aria-controls="login-tabpanel-1"
              icon={<Security fontSize="small" />}
              iconPosition="start"
            />
          </Tabs>
        )}
        
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Enter your master password
          </Typography>
          
          <form onSubmit={handlePasswordSubmit}>
            <TextField
              fullWidth
              variant="outlined"
              margin="normal"
              label="Master Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!passwordError}
              helperText={passwordError || ""}
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
          </form>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Enter your verification code
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Enter the 6-digit code from your authenticator app
          </Alert>
          
          <form onSubmit={handleTotpSubmit}>
            <TextField
              fullWidth
              variant="outlined"
              margin="normal"
              label="Verification Code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              error={!!totpError}
              helperText={totpError || ""}
              disabled={loading}
              inputProps={{ 
                maxLength: 9,
                inputMode: 'numeric',
                pattern: '[0-9]*'
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
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify'}
            </Button>
          </form>
        </TabPanel>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={onForgotPassword}
            size="small"
            color="primary"
          >
            Forgot Password?
          </Button>
          
          <Button
            startIcon={<Help />}
            onClick={handleShowHelp}
            size="small"
            color="info"
          >
            Help
          </Button>
        </Box>
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
                {isTotpEnabled && (
                  <>
                    If you have two-factor authentication enabled, you can log in with either your:
                    <ul>
                      <li>Master password, or</li>
                      <li>Verification code from your authenticator app</li>
                    </ul>
                  </>
                )}
              </Typography>
            </li>
            <li>
              <Typography paragraph>
                If you've forgotten your password, use the "Forgot Password?" option to 
                reset your master password by answering your security questions.
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelp(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginScreen;
