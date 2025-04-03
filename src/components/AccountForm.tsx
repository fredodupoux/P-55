import {
  Cancel,
  Key,
  Save,
  Settings,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import {
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import React, { useState } from 'react';
import PasswordGeneratorService from '../services/PasswordGeneratorService';
import { Account } from '../types/Account';
import PasswordGeneratorDialog from './PasswordGeneratorDialog';

interface AccountFormProps {
  account?: Account;
  onSave: (account: Omit<Account, 'id'> & { id?: number }) => void;
  onCancel: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ account, onSave, onCancel }) => {
  const [name, setName] = useState(account?.name || '');
  const [username, setUsername] = useState(account?.username || '');
  const [password, setPassword] = useState(account?.password || '');
  const [website, setWebsite] = useState(account?.website || 'https://');
  const [notes, setNotes] = useState(account?.notes || '');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordGeneratorOpen, setPasswordGeneratorOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: account?.id,
      name,
      username,
      password,
      website,
      notes
    });
  };

  const handlePasswordSelect = (newPassword: string) => {
    setPassword(newPassword);
  };

  const generatePasswordDirectly = () => {
    // Generate a password with default options (symbols always on)
    const newPassword = PasswordGeneratorService.generatePassword();
    setPassword(newPassword);
  };

  const isFormValid = name.trim() !== '' && username.trim() !== '' && password.trim() !== '';

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        {account ? 'Edit Account' : 'Add New Account'}
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Account Name"
              fullWidth
              required
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gmail, Facebook, Bank"
              autoFocus
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Username or Email"
              fullWidth
              required
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. yourname@example.com"
            />
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <TextField
                label="Password"
                fullWidth
                required
                variant="outlined"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        aria-label={showPassword ? 'hide password' : 'show password'}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                startIcon={<Key />}
                variant="outlined"
                size="medium"
                onClick={generatePasswordDirectly}
                sx={{ ml: 2, height: '56px' }}
              >
                Generate Password
              </Button>
              <Tooltip title="Advanced Password Settings">
                <IconButton
                  onClick={() => setPasswordGeneratorOpen(true)}
                  sx={{ ml: 1 }}
                  color="primary"
                  aria-label="password settings"
                >
                  <Settings />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Website"
              fullWidth
              variant="outlined"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional information here"
            />
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={onCancel}
              startIcon={<Cancel />}
              size="large"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              startIcon={<Save />}
              disabled={!isFormValid}
              size="large"
            >
              Save
            </Button>
          </Grid>
        </Grid>
      </form>

      {/* Password Generator Dialog */}
      <PasswordGeneratorDialog
        open={passwordGeneratorOpen}
        onClose={() => setPasswordGeneratorOpen(false)}
        onSelectPassword={handlePasswordSelect}
      />
    </Box>
  );
};

export default AccountForm;
