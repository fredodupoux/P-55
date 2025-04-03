import { ContentCopy, Refresh, Visibility, VisibilityOff } from '@mui/icons-material';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    Slider,
    TextField,
    Typography
} from '@mui/material';
import React, { useState } from 'react';
import PasswordGeneratorService, { PasswordOptions } from '../services/PasswordGeneratorService';

interface PasswordGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectPassword: (password: string) => void;
}

const PasswordGeneratorDialog: React.FC<PasswordGeneratorDialogProps> = ({
  open,
  onClose,
  onSelectPassword
}) => {
  // Generated password
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  
  // Password options - make sure symbols are enabled by default
  const [passwordOptions, setPasswordOptions] = useState<PasswordOptions>({
    ...PasswordGeneratorService.DEFAULT_OPTIONS,
    includeSymbols: true
  });
  
  React.useEffect(() => {
    if (open) {
      // Generate a password when dialog opens
      setGeneratedPassword(PasswordGeneratorService.generatePassword(passwordOptions));
    }
  }, [open]);
  
  const generatePassword = () => {
    setGeneratedPassword(PasswordGeneratorService.generatePassword(passwordOptions));
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    // Could add a snackbar notification here
  };
  
  const handleUsePassword = () => {
    onSelectPassword(generatedPassword);
    onClose();
  };

  const handleLengthChange = (event: Event, newValue: number | number[]) => {
    setPasswordOptions({
      ...passwordOptions,
      length: newValue as number
    });
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Password Generator</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Generated Password"
            value={generatedPassword}
            type={showPassword ? 'text' : 'password'}
            margin="normal"
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                  <IconButton
                    onClick={handleCopyPassword}
                    edge="end"
                  >
                    <ContentCopy />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          <Button
            startIcon={<Refresh />}
            variant="outlined"
            onClick={generatePassword}
            sx={{ mt: 1 }}
          >
            Generate New Password
          </Button>
        </Box>
        
        <Box>
          <Typography gutterBottom>Password Length: {passwordOptions.length}</Typography>
          <Slider
            value={passwordOptions.length}
            onChange={handleLengthChange}
            onChangeCommitted={generatePassword}
            min={8}
            max={30}
            step={1}
            valueLabelDisplay="auto"
            marks={[
              { value: 8, label: '8' },
              { value: 12, label: '12' },
              { value: 20, label: '20' },
              { value: 30, label: '30' }
            ]}
          />
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={passwordOptions.includeUppercase}
                    onChange={(e) => {
                      setPasswordOptions({
                        ...passwordOptions,
                        includeUppercase: e.target.checked
                      });
                      setTimeout(generatePassword, 0);
                    }}
                  />
                }
                label="Uppercase Letters"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={passwordOptions.includeLowercase}
                    onChange={(e) => {
                      setPasswordOptions({
                        ...passwordOptions,
                        includeLowercase: e.target.checked
                      });
                      setTimeout(generatePassword, 0);
                    }}
                  />
                }
                label="Lowercase Letters"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={passwordOptions.includeNumbers}
                    onChange={(e) => {
                      setPasswordOptions({
                        ...passwordOptions,
                        includeNumbers: e.target.checked
                      });
                      setTimeout(generatePassword, 0);
                    }}
                  />
                }
                label="Numbers"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={passwordOptions.includeSymbols}
                    onChange={(e) => {
                      setPasswordOptions({
                        ...passwordOptions,
                        includeSymbols: e.target.checked
                      });
                      setTimeout(generatePassword, 0);
                    }}
                  />
                }
                label="Symbols"
              />
            </Grid>
          </Grid>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Strong passwords contain a mix of uppercase letters, lowercase letters, 
            numbers, and symbols. The longer the password, the more secure it is.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleUsePassword} 
          variant="contained" 
          color="primary"
        >
          Use This Password
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordGeneratorDialog;