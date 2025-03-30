import AddIcon from '@mui/icons-material/Add';
import KeyIcon from '@mui/icons-material/Key';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import Alert from '@mui/material/Alert';
import React, { useEffect, useState } from 'react';
import AccountService from '../services/AccountService';
import { Account } from '../types/Account';
import AccountDetailPanel from './AccountDetailPanel';
import AccountForm from './AccountForm';
import PasswordChangeDialog from './PasswordChangeDialog';
import ThemeToggle from './ThemeToggle';

interface MainInterfaceProps {
  onLogout: () => void;
}

const MainInterface: React.FC<MainInterfaceProps> = ({ onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  // Load accounts when component mounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setIsLoading(true);
        const loadedAccounts = await AccountService.getAccounts();
        setAccounts(loadedAccounts);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load accounts:', error);
        setNotification({
          open: true,
          message: 'Failed to load accounts',
          severity: 'error'
        });
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, []);

  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsAddingAccount(true);
  };

  const handleSaveNewAccount = async (accountData: Omit<Account, 'id'> & { id?: number }) => {
    try {
      if (accountData.id) {
        // Update existing account - let the update function handle it
        const updatedAccount = await AccountService.updateAccount(accountData as Account);
        if (updatedAccount) {
          // Replace the account in the accounts array without adding a duplicate
          setAccounts(prevAccounts => 
            prevAccounts.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc)
          );
          setNotification({
            open: true,
            message: 'Account updated successfully',
            severity: 'success'
          });
        }
      } else {
        // Add new account
        const newAccount = await AccountService.addAccount(accountData);
        if (newAccount) {
          // Add the new account to the accounts array
          setAccounts(prevAccounts => [...prevAccounts, newAccount]);
          setSelectedAccount(newAccount.id);
          setNotification({
            open: true,
            message: 'Account added successfully',
            severity: 'success'
          });
        }
      }
      setIsAddingAccount(false);
    } catch (error) {
      console.error('Failed to save account:', error);
      setNotification({
        open: true,
        message: 'Failed to save account',
        severity: 'error'
      });
    }
  };

  const handleUpdateAccount = async (updatedAccount: Account) => {
    try {
      const result = await AccountService.updateAccount(updatedAccount);
      if (result) {
        // Replace the account in the accounts array without adding a duplicate
        setAccounts(prevAccounts => 
          prevAccounts.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc)
        );
        setNotification({
          open: true,
          message: 'Account updated successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to update account:', error);
      setNotification({
        open: true,
        message: 'Failed to update account',
        severity: 'error'
      });
    }
  };

  const handleDeleteAccount = async (id: number) => {
    try {
      const success = await AccountService.deleteAccount(id);
      if (success) {
        setAccounts(prevAccounts => prevAccounts.filter(acc => acc.id !== id));
        setSelectedAccount(null);
        setNotification({
          open: true,
          message: 'Account deleted successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      setNotification({
        open: true,
        message: 'Failed to delete account',
        severity: 'error'
      });
    }
  };

  const handleCancel = () => {
    setIsAddingAccount(false);
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handlePasswordChangeOpen = () => {
    handleMenuClose();
    setPasswordChangeOpen(true);
  };

  const handlePasswordChangeSuccess = () => {
    setNotification({
      open: true,
      message: 'Master password changed successfully',
      severity: 'success'
    });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Pass+55
          </Typography>
          <Button 
            color="inherit"
            onClick={handleMenuOpen}
            startIcon={<KeyIcon />}
            sx={{ mr: 1 }}
          >
            Security
          </Button>
          <ThemeToggle />
          <Button 
            color="inherit" 
            onClick={onLogout}
            startIcon={<LogoutIcon />}
          >
            Log Out
          </Button>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handlePasswordChangeOpen}>
              Change Master Password
            </MenuItem>
            <MenuItem onClick={() => {
              AccountService.createBackup();
              handleMenuClose();
              setNotification({
                open: true,
                message: 'Backup created successfully',
                severity: 'success'
              });
            }}>
              Create Backup
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        {/* Left Panel - Account List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '75vh', overflow: 'auto' }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <TextField
                placeholder="Search accounts"
                variant="outlined"
                size="small"
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
              <IconButton 
                color="primary" 
                sx={{ ml: 1 }}
                aria-label="Add new account"
                onClick={handleAddAccount}
              >
                <AddIcon />
              </IconButton>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <List>
              {isLoading ? (
                <Typography align="center" color="text.secondary">
                  Loading accounts...
                </Typography>
              ) : filteredAccounts.length > 0 ? (
                filteredAccounts.map((account) => (
                  <ListItem 
                    key={account.id} 
                    disablePadding
                    divider
                  >
                    <ListItemButton
                      selected={selectedAccount === account.id}
                      onClick={() => {
                        setSelectedAccount(account.id);
                        setIsAddingAccount(false);
                      }}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemText
                        primary={account.name}
                        secondary={account.username}
                        primaryTypographyProps={{ 
                          fontWeight: selectedAccount === account.id ? 'bold' : 'normal' 
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              ) : (
                <Typography align="center" color="text.secondary">
                  {searchTerm ? 'No matching accounts found' : 'No accounts found'}
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
        
        {/* Right Panel - Account Details or Add Form */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '75vh', overflow: 'auto' }}>
            {isAddingAccount ? (
              <AccountForm 
                onSave={handleSaveNewAccount}
                onCancel={handleCancel}
              />
            ) : selectedAccount ? (
              <AccountDetailPanel 
                account={accounts.find(a => a.id === selectedAccount)!}
                onSave={handleUpdateAccount}
                onDelete={handleDeleteAccount}
              />
            ) : (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%' 
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {accounts.length > 0 
                    ? 'Select an account to view details' 
                    : 'No accounts yet'}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  size="large"
                  sx={{ mt: 2 }}
                  onClick={handleAddAccount}
                >
                  Add New Account
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Notification Snackbar */}
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

      {/* Password Change Dialog */}
      <PasswordChangeDialog 
        open={passwordChangeOpen} 
        onClose={() => setPasswordChangeOpen(false)}
        onSuccess={handlePasswordChangeSuccess}
      />
    </Box>
  );
};

export default MainInterface;
