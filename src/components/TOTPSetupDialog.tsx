import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import AccountService, { TOTPSettings, TOTPSetupResult } from '../services/AccountService';

interface TOTPSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TOTPSetupDialog: React.FC<TOTPSetupDialogProps> = ({ open, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<TOTPSettings | null>(null);
  const [setupResult, setSetupResult] = useState<TOTPSetupResult | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Load current TOTP settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSettings();
    } else {
      // Reset state when dialog closes
      setVerificationCode('');
      setSetupResult(null);
      setError(null);
    }
  }, [open]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const totpSettings = await AccountService.getTOTPSettings();
      setSettings(totpSettings);
    } catch (err) {
      setError('Failed to load TOTP settings');
      console.error('Error loading TOTP settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableTOTP = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await AccountService.enableTOTP();
      if (result.success) {
        setSetupResult(result);
      } else {
        setError(result.error || 'Failed to enable TOTP');
      }
    } catch (err) {
      setError('An error occurred while enabling TOTP');
      console.error('Error enabling TOTP:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableTOTP = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await AccountService.disableTOTP();
      if (success) {
        // Update settings to reflect the change
        setSettings(prev => prev ? { ...prev, enabled: false } : null);
        onSuccess();
      } else {
        setError('Failed to disable TOTP');
      }
    } catch (err) {
      setError('An error occurred while disabling TOTP');
      console.error('Error disabling TOTP:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setError('Please enter a valid verification code');
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      const isValid = await AccountService.verifyTOTPCode(verificationCode);
      if (isValid) {
        // Load updated settings
        await loadSettings();
        onSuccess();
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while verifying the code');
      console.error('Error verifying TOTP code:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Two-Factor Authentication</DialogTitle>
      
      <DialogContent>
        {isLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : settings?.enabled ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Two-factor authentication is enabled
            </Alert>
            
            <Typography variant="body1" gutterBottom>
              You can log in using either your master password or a verification code from your authenticator app.
            </Typography>
            
            <Box mt={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enabled}
                    onChange={handleDisableTOTP}
                    color="primary"
                  />
                }
                label="Enable two-factor authentication"
              />
            </Box>
          </Box>
        ) : setupResult ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              Scan QR Code
            </Typography>
            
            <Typography variant="body1" gutterBottom>
              Scan this QR code with your authenticator app (like Microsoft Authenticator) to set up two-factor authentication.
            </Typography>
            
            <Box display="flex" justifyContent="center" my={3}>
              <img 
                src={setupResult.qrCode} 
                alt="QR Code for TOTP Setup" 
                style={{ maxWidth: '200px' }}
              />
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Manual Entry
            </Typography>
            
            <Typography variant="body1" gutterBottom>
              If you can't scan the QR code, you can manually enter this key into your authenticator app:
            </Typography>
            
            <Box 
              bgcolor="background.paper" 
              p={2} 
              my={2} 
              borderRadius={1}
              fontFamily="monospace"
              fontSize="1.1rem"
              textAlign="center"
            >
              {setupResult.manualEntryKey}
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Verify Setup
            </Typography>
            
            <Typography variant="body1" gutterBottom>
              Enter the verification code from your authenticator app to complete setup:
            </Typography>
            
            <TextField
              fullWidth
              label="Verification Code"
              variant="outlined"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              margin="normal"
              inputProps={{ 
                maxLength: 9,
                inputMode: 'numeric',
                pattern: '[0-9]*'
              }}
              disabled={isVerifying}
            />
            
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleVerifyCode}
              disabled={isVerifying || !verificationCode}
              fullWidth
              sx={{ mt: 2 }}
            >
              {isVerifying ? <CircularProgress size={24} /> : 'Verify & Enable'}
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="body1" gutterBottom>
              Two-factor authentication adds an extra layer of security to your account. When enabled, you'll need either your master password or a verification code from your authenticator app to log in.
            </Typography>
            
            <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
              You can use Microsoft Authenticator, Google Authenticator, Authy, or any other TOTP-compatible authenticator app.
            </Typography>
            
            <Box mt={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.enabled || false}
                    onChange={handleEnableTOTP}
                    color="primary"
                  />
                }
                label="Enable two-factor authentication"
              />
            </Box>
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TOTPSetupDialog;