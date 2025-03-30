import { Alert, Snackbar as MuiSnackbar, SnackbarProps as MuiSnackbarProps } from '@mui/material';
import React from 'react';

interface SnackbarProps extends Omit<MuiSnackbarProps, 'children'> {
  message: string;
  severity?: 'success' | 'info' | 'warning' | 'error';
}

const Snackbar: React.FC<SnackbarProps> = ({ 
  message, 
  severity = 'success', 
  ...props 
}) => {
  return (
    <MuiSnackbar {...props}>
      <Alert 
        elevation={6} 
        variant="filled" 
        severity={severity}
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </MuiSnackbar>
  );
};

export default Snackbar;
