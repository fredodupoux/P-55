import { Visibility, VisibilityOff } from '@mui/icons-material';
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
    TextField
} from '@mui/material';
import React, { useState } from 'react';
import AccountService from '../services/AccountService';

interface PasswordChangeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PasswordChangeDialog: React.FC<PasswordChangeDialogProps> = ({ 
  open, 
  onClose,
  onSuccess 
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setError(null);
    
    // Validate inputs
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    
    if (!newPassword) {
      setError('New password is required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return;
    }
    
    // Minimum length check
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await AccountService.changeMasterPassword(currentPassword, newPassword);
      
      if (success) {
        setIsLoading(false);
        
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Notify parent component
        onSuccess();
        
        // Close dialog
        onClose();
      } else {
        setError('Failed to change password. Please check your current password and try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setError('An error occurred while changing the password');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Clear form
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    
    // Close dialog
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Change Master Password</DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            label="Current Password"
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
            autoFocus
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          <TextField
            label="New Password"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          <TextField
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
            error={confirmPassword !== '' && newPassword !== confirmPassword}
            helperText={confirmPassword !== '' && newPassword !== confirmPassword 
              ? 'Passwords do not match' 
              : ''}
          />
          
          {error && (
            <Box sx={{ color: 'error.main', mt: 2 }}>
              {error}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={isLoading || newPassword !== confirmPassword}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PasswordChangeDialog;
