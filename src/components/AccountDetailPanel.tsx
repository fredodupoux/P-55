import {
  ContentCopy,
  Delete,
  Edit,
  Launch,
  Save,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography
} from '@mui/material';
import React, { useState } from 'react';
import { Account } from '../types/Account';

interface AccountDetailPanelProps {
  account: Account;
  onSave: (account: Account) => void;
  onDelete: (id: number) => void;
}

const AccountDetailPanel: React.FC<AccountDetailPanelProps> = ({ account, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [name, setName] = useState(account.name);
  const [username, setUsername] = useState(account.username);
  const [password, setPassword] = useState(account.password);
  const [website, setWebsite] = useState(account.website);
  const [notes, setNotes] = useState(account.notes);

  // Update form state when account changes
  React.useEffect(() => {
    setName(account.name);
    setUsername(account.username);
    setPassword(account.password);
    setWebsite(account.website);
    setNotes(account.notes);
  }, [account]);

  const handleSave = () => {
    onSave({
      ...account,
      name,
      username,
      password,
      website,
      notes
    });
    setIsEditing(false);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    // Would add a snackbar notification here
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this account?")) {
      onDelete(account.id);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, textAlign: 'left' }}>
        <Typography variant="h5" component="h2" align="left">
          {isEditing ? 'Edit Account' : 'Account Details'}
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            label="Account Name"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isEditing}
            InputProps={{
              readOnly: !isEditing,
            }}
            InputLabelProps={{
              shrink: true, // Keep the label at the top always
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Username or Email"
            fullWidth
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={!isEditing}
            InputProps={{
              readOnly: !isEditing,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => navigator.clipboard.writeText(username)}
                    edge="end"
                    aria-label="copy username"
                  >
                    <ContentCopy />
                  </IconButton>
                </InputAdornment>
              )
            }}
            InputLabelProps={{
              shrink: true, // Keep the label at the top always
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Password"
            fullWidth
            variant="outlined"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!isEditing}
            InputProps={{
              readOnly: !isEditing,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    aria-label={showPassword ? 'hide password' : 'show password'}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                  <IconButton
                    onClick={handleCopyPassword}
                    edge="end"
                    aria-label="copy password"
                  >
                    <ContentCopy />
                  </IconButton>
                </InputAdornment>
              )
            }}
            InputLabelProps={{
              shrink: true, // Keep the label at the top always
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Website"
            fullWidth
            variant="outlined"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={!isEditing}
            InputProps={{
              readOnly: !isEditing,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => window.open(website, '_blank')}
                    edge="end"
                    aria-label="open website"
                    disabled={!website}
                  >
                    <Launch />
                  </IconButton>
                </InputAdornment>
              )
            }}
            InputLabelProps={{
              shrink: true, // Keep the label at the top always
            }}
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
            disabled={!isEditing}
            InputProps={{
              readOnly: !isEditing,
            }}
            InputLabelProps={{
              shrink: true, // Keep the label at the top always
            }}
          />
        </Grid>
        
        {/* Action buttons moved below Notes field and aligned to the right */}
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          {isEditing ? (
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              sx={{ mr: 1 }}
            >
              Save
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => setIsEditing(true)}
              sx={{ mr: 1 }}
            >
              Edit
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccountDetailPanel;
