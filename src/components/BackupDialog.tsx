import {
    CloudUploadOutlined,
    FileDownloadOutlined,
    FolderOutlined,
    RestoreOutlined
} from '@mui/icons-material';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    FormControlLabel,
    FormGroup,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import AccountService from '../services/AccountService';

interface BackupDialogProps {
  open: boolean;
  onClose: () => void;
}

const BackupDialog: React.FC<BackupDialogProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    path?: string;
    isBackup?: boolean;
    isRestore?: boolean;
    isExport?: boolean;
  } | null>(null);

  // Export related states
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [includePasswords, setIncludePasswords] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Reset the state when the dialog is opened
  useEffect(() => {
    if (open) {
      setResult(null);
      setShowExportOptions(false);
      setIncludePasswords(false);
      
      // Load accounts when dialog opens
      const loadAccounts = async () => {
        try {
          const loadedAccounts = await AccountService.getAccounts();
          setAccounts(loadedAccounts);
        } catch (error) {
          console.error('Failed to load accounts for export:', error);
        }
      };
      
      loadAccounts();
    }
  }, [open]);
  
  // Automatic restart after successful restore
  useEffect(() => {
    let restartTimer: NodeJS.Timeout | null = null;
    
    if (result?.success && result?.isRestore) {
      setLoading(true); // Keep loading state active during countdown
      
      // Show a countdown message
      const countdown = 3;
      let counter = countdown;
      
      setResult({
        ...result,
        message: `Database restored successfully. Restarting in ${counter} seconds...`
      });
      
      // Update the countdown every second
      const timer = setInterval(() => {
        counter -= 1;
        
        if (counter <= 0) {
          clearInterval(timer);
          
          // Trigger restart when counter reaches zero
          if (window.electronAPI) {
            window.electronAPI.restartApplication()
              .catch(error => console.error('Failed to restart application:', error));
          }
        } else {
          // Update the message with the new countdown
          setResult(prevResult => {
            if (prevResult) {
              return {
                ...prevResult,
                message: `Database restored successfully. Restarting in ${counter} seconds...`
              };
            }
            return prevResult;
          });
        }
      }, 1000);
      
      return () => {
        if (timer) clearInterval(timer);
        if (restartTimer) clearTimeout(restartTimer);
      };
    }
  }, [result?.success, result?.isRestore]);

  const handleCustomBackup = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const result = await AccountService.createBackupAtCustomLocation();
      
      if (result.success) {
        setResult({
          success: true,
          isBackup: true,
          message: 'Backup created successfully',
          path: result.path
        });
      } else {
        setResult({
          success: false,
          isBackup: true,
          message: result.error || 'Failed to create backup'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        isBackup: true,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    // Show a confirmation dialog because this is a potentially destructive action
    const confirmed = window.confirm(
      'WARNING: Restoring from a backup will replace your current database. ' +
      'This action cannot be undone. Are you sure you want to continue?'
    );
    
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const result = await AccountService.restoreFromBackup();
      
      if (result.success) {
        setResult({
          success: true,
          isRestore: true,
          message: 'Database restored successfully. Restarting in 3 seconds...',
          path: result.path
        });
        // Note: The automatic restart is handled by the useEffect hook
      } else {
        setResult({
          success: false,
          isRestore: true,
          message: result.error || 'Failed to restore database'
        });
        setLoading(false);
      }
    } catch (error) {
      setResult({
        success: false,
        isRestore: true,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      setLoading(false);
    }
  };

  const handleBrowseFolder = async () => {
    await AccountService.showDatabaseFolder();
  };
  
  const toggleIncludePasswords = () => {
    if (!includePasswords) {
      // Show warning when enabling passwords
      setShowWarning(true);
    }
    setIncludePasswords(!includePasswords);
  };
  
  const handleExportCSV = () => {
    setLoading(true);
    
    try {
      // Sort accounts by name for a more organized list
      const sortedAccounts = [...accounts].sort((a, b) => 
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
      
      // Build CSV header based on selected options
      let headers = ['Website/App', 'Username/Email'];
      if (includePasswords) {
        headers.push('Password');
      }
      headers.push('URL');
      if (includeNotes) {
        headers.push('Notes');
      }
      headers.push('Last Modified');
      
      // Start with the header row
      let csvContent = headers.join(',') + '\n';
      
      // Add each account as a row in the CSV
      sortedAccounts.forEach(account => {
        // Escape fields with quotes if they contain commas, and escape any quotes within fields
        const escapeField = (field: string) => {
          const value = field || '';
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            // Replace double quotes with escaped double quotes
            return '"' + value.replace(/"/g, '""') + '"';
          }
          return value;
        };
        
        // Format date to a readable string
        const formatDate = (timestamp?: number) => {
          if (!timestamp) return 'N/A';
          return new Date(timestamp).toLocaleDateString();
        };
        
        let row = [
          escapeField(account.name),
          escapeField(account.username)
        ];
        
        if (includePasswords) {
          row.push(escapeField(account.password));
        }
        
        row.push(escapeField(account.url || account.website || ''));
        
        if (includeNotes) {
          row.push(escapeField(account.notes));
        }
        
        row.push(escapeField(formatDate(account.lastModified)));
        
        csvContent += row.join(',') + '\n';
      });
      
      // Create a Blob with the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create a download link and trigger the download
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `password-list-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Reset sensitive options after downloading for security
      setIncludePasswords(false);
      
      setResult({
        success: true,
        isExport: true,
        message: 'Passwords exported successfully to CSV file'
      });
    } catch (error) {
      setResult({
        success: false,
        isExport: true,
        message: `Error exporting passwords: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
      // Don't close the dialog automatically to allow user to see the result
    }
  };
  
  const handleShowExportOptions = () => {
    setShowExportOptions(true);
    setResult(null);
  };

  const handleBackToOptions = () => {
    setShowExportOptions(false);
    setResult(null);
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      scroll="paper"
      aria-labelledby="backup-dialog-title"
    >
      <DialogTitle id="backup-dialog-title">
        Database Backup and Data Management
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
            <CircularProgress sx={{ mb: 2 }} />
            {result?.success && result?.isRestore && (
              <Typography variant="body1" align="center">
                {result.message}
              </Typography>
            )}
          </Box>
        ) : result ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity={result.success ? "success" : "error"}>
              {result.message}
            </Alert>
            
            {result.path && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                {result.path}
              </Typography>
            )}
          </Box>
        ) : showExportOptions ? (
          // Export options content
          <Box>
            <DialogContentText paragraph>
              Select the information you want to include in the exported CSV file:
            </DialogContentText>
            
            {showWarning && includePasswords && (
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  mb: 2, 
                  bgcolor: 'warning.light', 
                  color: 'warning.contrastText',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <SecurityIcon sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">Security Warning</Typography>
                  <Typography variant="body2">
                    Including actual passwords in exported files poses a security risk. 
                    Only export passwords if absolutely necessary and store the file securely.
                  </Typography>
                </Box>
              </Paper>
            )}
            
            <FormGroup sx={{ mb: 3 }}>
              <FormControlLabel 
                control={
                  <Checkbox
                    checked={includePasswords}
                    onChange={toggleIncludePasswords}
                    icon={<VisibilityOffIcon />}
                    checkedIcon={<VisibilityIcon />}
                  />
                } 
                label="Include actual passwords (security risk)"
              />
              <FormControlLabel 
                control={
                  <Checkbox
                    checked={includeNotes}
                    onChange={() => setIncludeNotes(!includeNotes)}
                  />
                } 
                label="Include notes"
              />
            </FormGroup>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                The CSV file can be opened in spreadsheet programs like Microsoft Excel, Google Sheets, or Apple Numbers.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                File will be named: <code>password-list-{new Date().toISOString().slice(0, 10)}.csv</code>
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button onClick={handleBackToOptions} sx={{ mr: 1 }}>
                Back
              </Button>
              <Button 
                variant="contained" 
                startIcon={<FileDownloadOutlined />}
                onClick={handleExportCSV}
                color="primary"
              >
                Export CSV
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            <DialogContentText sx={{ mb: 3 }}>
              Create backups of your password database, restore from a backup, or export passwords to a CSV file.
            </DialogContentText>
            
            <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Backup Options
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CloudUploadOutlined />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Custom Backup" 
                    secondary="Save a backup to a location of your choice"
                  />
                  <Button 
                    variant="outlined"
                    onClick={handleCustomBackup}
                    color="primary"
                  >
                    Choose Location
                  </Button>
                </ListItem>
                
                <Divider sx={{ my: 1 }} />
                
                <ListItem>
                  <ListItemIcon>
                    <FolderOutlined />
                  </ListItemIcon>
                  <ListItemText 
                    primary="View Backup Folder" 
                    secondary="Open the folder containing your database and backups"
                  />
                  <Button 
                    variant="outlined"
                    onClick={handleBrowseFolder}
                  >
                    Browse
                  </Button>
                </ListItem>
              </List>
            </Paper>
            
            <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Export Options
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <FileDownloadOutlined />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Export Passwords" 
                    secondary="Export your passwords to a CSV file that can be opened in Excel"
                  />
                  <Button 
                    variant="outlined"
                    onClick={handleShowExportOptions}
                    color="primary"
                  >
                    Export
                  </Button>
                </ListItem>
              </List>
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom color="warning.main">
                Restore Options
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <RestoreOutlined color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Restore from Backup" 
                    secondary="WARNING: This will replace your current database"
                  />
                  <Button 
                    variant="outlined"
                    onClick={handleRestore}
                    color="warning"
                  >
                    Restore
                  </Button>
                </ListItem>
              </List>
            </Paper>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={loading && result?.isRestore} // Disable close button during restore+restart
        >
          Close
        </Button>
        
        {result && !showExportOptions && !result.isRestore && (
          <Button 
            onClick={() => setResult(null)}
            color="primary"
            disabled={loading}
          >
            Back to Options
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BackupDialog;