import AddIcon from '@mui/icons-material/Add';
import BackupIcon from '@mui/icons-material/Backup';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import KeyIcon from '@mui/icons-material/Key';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import PasswordIcon from '@mui/icons-material/Password';
import SearchIcon from '@mui/icons-material/Search';
import SecurityIcon from '@mui/icons-material/Security';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import VisibilityIcon from '@mui/icons-material/Visibility';
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
import { keyframes } from '@mui/system';
import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import AccountService from '../services/AccountService';
import { Account } from '../types/Account';
import AccountDetailPanel from './AccountDetailPanel';
import AccountForm from './AccountForm';
import BackupDialog from './BackupDialog';
import ImportDialog from './ImportDialog';
import PasswordChangeDialog from './PasswordChangeDialog';
import TOTPSetupDialog from './TOTPSetupDialog';

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
  const [totpSetupOpen, setTotpSetupOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [securityMenuAnchorEl, setSecurityMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [viewMenuAnchorEl, setViewMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isElectron, setIsElectron] = useState<boolean>(false);
  
  // Get theme context
  const { mode, setMode, isDarkMode } = useTheme();

  // Scrollbar visibility state
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Define fade-out animation
  const fadeOut = keyframes`
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  `;

  // Custom scrollbar style for account list with animation
  const scrollbarStyle = {
    '&::-webkit-scrollbar': {
      width: '4px',
      transition: 'all 0.3s ease',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: isScrolling ? '#888' : 'transparent',
      borderRadius: '4px',
      transition: 'background-color 0.3s ease',
      animation: isScrolling ? 'none' : `${fadeOut} 1s ease-out 2s forwards`,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: '#555',
    },
    '&': {
      scrollbarWidth: 'thin',
      scrollbarColor: isScrolling ? '#888 transparent' : 'transparent transparent',
      transition: 'scrollbar-color 0.3s ease',
    },
  };

  // Handle scroll event to show scrollbar
  const handleScroll = () => {
    // Clear any existing timer
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    
    // Set scrolling state to true
    setIsScrolling(true);
    
    // Set a timer to hide the scrollbar after 2 seconds
    scrollTimerRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 2000);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  // Check if we're running in Electron
  useEffect(() => {
    setIsElectron(!!window.electronAPI);
    
    // Initialize zoom level
    const initZoomLevel = async () => {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.getZoomLevel();
          if (result.success) {
            setZoomLevel(result.zoomFactor);
          }
        }
      } catch (error) {
        console.error('Failed to get zoom level:', error);
      }
    };
    
    if (isElectron) {
      initZoomLevel();
    }
  }, [isElectron]);

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

  const handleSecurityMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSecurityMenuAnchorEl(event.currentTarget);
  };

  const handleSecurityMenuClose = () => {
    setSecurityMenuAnchorEl(null);
  };

  const handleViewMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setViewMenuAnchorEl(event.currentTarget);
  };

  const handleViewMenuClose = () => {
    setViewMenuAnchorEl(null);
  };
  
  const handleThemeToggle = () => {
    const newMode = isDarkMode ? 'light' : 'dark';
    setMode(newMode);
    handleViewMenuClose();
    
    setNotification({
      open: true,
      message: `Theme changed to ${isDarkMode ? 'Light Mode' : 'Dark Mode'}`,
      severity: 'info'
    });
  };
  
  const handleSystemTheme = () => {
    setMode('system');
    handleViewMenuClose();
    
    setNotification({
      open: true,
      message: 'Theme set to System Default',
      severity: 'info'
    });
  };

  const handleZoomIn = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.zoomIn();
        if (result.success) {
          setZoomLevel(result.zoomFactor);
          setNotification({
            open: true,
            message: `Text Size: ${Math.round(result.zoomFactor * 100)}%`,
            severity: 'info'
          });
        }
      }
    } catch (error) {
      console.error('Failed to increase text size:', error);
    }
    handleViewMenuClose();
  };

  const handleZoomOut = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.zoomOut();
        if (result.success) {
          setZoomLevel(result.zoomFactor);
          setNotification({
            open: true,
            message: `Text Size: ${Math.round(result.zoomFactor * 100)}%`,
            severity: 'info'
          });
        }
      }
    } catch (error) {
      console.error('Failed to decrease text size:', error);
    }
    handleViewMenuClose();
  };

  const handlePasswordChangeSuccess = () => {
    setNotification({
      open: true,
      message: 'Master password changed successfully',
      severity: 'success'
    });
  };

  const handleTOTPSetupSuccess = () => {
    setNotification({
      open: true,
      message: 'Two-factor authentication settings updated',
      severity: 'success'
    });
  };
  
  const handleBackupDialogClose = () => {
    setBackupDialogOpen(false);
  };

  const handleImportDialogClose = () => {
    setImportDialogOpen(false);
  };

  const handleImportSuccess = (importedCount: number) => {
    // Reload accounts after successful import
    const loadAccounts = async () => {
      try {
        const loadedAccounts = await AccountService.getAccounts();
        setAccounts(loadedAccounts);
      } catch (error) {
        console.error('Failed to reload accounts after import:', error);
      }
    };
    
    loadAccounts();
    
    setNotification({
      open: true,
      message: `Successfully imported ${importedCount} passwords`,
      severity: 'success'
    });
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden'
    }}>
      <AppBar 
        position="static" 
        color="primary"
        sx={{ 
          boxShadow: 3
        }}
      >
        <Toolbar 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            minHeight: '72px', // Increase the height (default is 64px)
            py: 1.5 // Add vertical padding
          }}
        >
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              marginRight: 2,
              fontSize: '1.5rem' // Make the title a bit bigger
            }}
          >
            Pass+55
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              color="inherit"
              onClick={handleViewMenuOpen}
              startIcon={<VisibilityIcon />}
              sx={{ mr: 1.5, py: 1 }} // Slightly larger button
            >
              View
            </Button>
            
            <Button 
              color="inherit"
              onClick={handleSecurityMenuOpen}
              startIcon={<KeyIcon />}
              sx={{ mr: 1.5, py: 1 }} // Slightly larger button
            >
              Security
            </Button>
            
            <Button 
              color="inherit" 
              onClick={onLogout}
              startIcon={<LogoutIcon />}
              sx={{ py: 1 }} // Slightly larger button
            >
              Log Out
            </Button>
          </Box>
          
          {/* View Menu */}
          <Menu
            anchorEl={viewMenuAnchorEl}
            open={Boolean(viewMenuAnchorEl)}
            onClose={handleViewMenuClose}
          >
            {isElectron && (
              <>
                <MenuItem onClick={handleZoomIn}>
                  <TextIncreaseIcon fontSize="small" sx={{ mr: 1 }} />
                  Increase Text Size ({Math.round(zoomLevel * 100)}%)
                </MenuItem>
                <MenuItem onClick={handleZoomOut}>
                  <TextDecreaseIcon fontSize="small" sx={{ mr: 1 }} />
                  Decrease Text Size
                </MenuItem>
                <Divider />
              </>
            )}
            
            {/* Theme options - single toggle for Light/Dark */}
            <MenuItem onClick={handleThemeToggle}>
              {isDarkMode ? (
                <>
                  <LightModeIcon fontSize="small" sx={{ mr: 1 }} />
                  Switch to Light Mode
                </>
              ) : (
                <>
                  <DarkModeIcon fontSize="small" sx={{ mr: 1 }} />
                  Switch to Dark Mode
                </>
              )}
            </MenuItem>
            <MenuItem
              onClick={handleSystemTheme}
              selected={mode === 'system'}
            >
              <SettingsBrightnessIcon fontSize="small" sx={{ mr: 1 }} />
              Use System Settings
            </MenuItem>
          </Menu>
          
          {/* Security Menu */}
          <Menu
            anchorEl={securityMenuAnchorEl}
            open={Boolean(securityMenuAnchorEl)}
            onClose={handleSecurityMenuClose}
          >
            <MenuItem onClick={() => {
              handleSecurityMenuClose();
              setPasswordChangeOpen(true);
            }}>
              <PasswordIcon fontSize="small" sx={{ mr: 1 }} />
              Change Master Password
            </MenuItem>
            <MenuItem onClick={() => {
              handleSecurityMenuClose();
              setTotpSetupOpen(true);
            }}>
              <SecurityIcon fontSize="small" sx={{ mr: 1 }} />
              Two-Factor Authentication
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => {
              handleSecurityMenuClose();
              setImportDialogOpen(true);
            }}>
              <ImportExportIcon fontSize="small" sx={{ mr: 1 }} />
              Import Passwords
            </MenuItem>
            <MenuItem onClick={() => {
              handleSecurityMenuClose();
              setBackupDialogOpen(true);
            }}>
              <BackupIcon fontSize="small" sx={{ mr: 1 }} />
              Backup & Restore
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Main content area - takes up all remaining space */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', p: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Left Panel - Account List */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
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
              
              <Box 
                sx={{ 
                  flexGrow: 1, 
                  overflow: 'auto',
                  ...scrollbarStyle // Apply custom scrollbar style here
                }}
                onScroll={handleScroll}
              >
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
              </Box>
            </Paper>
          </Grid>
          
          {/* Right Panel - Account Details or Add Form */}
          <Grid item xs={12} md={8} sx={{ height: '100%' }}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box 
                sx={{ 
                  flexGrow: 1, 
                  overflow: 'auto',
                  ...scrollbarStyle // Apply custom scrollbar style here too for consistency
                }}
                onScroll={handleScroll}
              >
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
                    {accounts.length === 0 && (
                      <Button
                        variant="outlined"
                        startIcon={<ImportExportIcon />}
                        size="large"
                        sx={{ mt: 2 }}
                        onClick={() => setImportDialogOpen(true)}
                      >
                        Import Passwords
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      
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
      
      {/* TOTP Setup Dialog */}
      <TOTPSetupDialog
        open={totpSetupOpen}
        onClose={() => setTotpSetupOpen(false)}
        onSuccess={handleTOTPSetupSuccess}
      />

      {/* Backup Dialog */}
      <BackupDialog 
        open={backupDialogOpen} 
        onClose={handleBackupDialogClose} 
      />

      {/* Import Dialog */}
      <ImportDialog
        open={importDialogOpen}
        onClose={handleImportDialogClose}
        onSuccess={handleImportSuccess}
      />
    </Box>
  );
};

export default MainInterface;
