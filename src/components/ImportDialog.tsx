import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
// Replace the missing browser icons with appropriate alternatives
import LanguageIcon from '@mui/icons-material/Language';
import WebIcon from '@mui/icons-material/Public';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PublicIcon from '@mui/icons-material/Web';
import AccountService, { AvailableBrowsers, BrowserImportResult } from '../services/AccountService';

// Map browser types to icons
const getBrowserIcon = (browserType: string) => {
  switch (browserType.toLowerCase()) {
    case 'chrome':
      return <PublicIcon />; // Alternative for Chrome
    case 'firefox':
      return <WebIcon />; // Alternative for Firefox
    default:
      return <LanguageIcon />;
  }
};

// Map browser types to display names
const getBrowserDisplayName = (browserType: string) => {
  const browserMap: { [key: string]: string } = {
    'chrome': 'Google Chrome',
    'firefox': 'Mozilla Firefox',
    'safari': 'Apple Safari',
    'edge': 'Microsoft Edge',
    'brave': 'Brave Browser',
    'opera': 'Opera'
  };
  
  return browserMap[browserType] || browserType;
};

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onSuccess }) => {
  const [availableBrowsers, setAvailableBrowsers] = useState<AvailableBrowsers | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<BrowserImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available browsers when dialog opens
  useEffect(() => {
    if (open) {
      detectBrowsers();
    } else {
      // Reset state when dialog closes
      setImportResult(null);
      setError(null);
      setImporting(false);
    }
  }, [open]);

  // Detect available browsers
  const detectBrowsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const browsers = await AccountService.getAvailableBrowsers();
      setAvailableBrowsers(browsers);
    } catch (err) {
      console.error('Failed to detect browsers:', err);
      setError('Failed to detect installed browsers');
    } finally {
      setLoading(false);
    }
  };

  // Handle browser selection for import
  const handleBrowserImport = async (browserType: string) => {
    setImporting(true);
    setError(null);
    setImportResult(null);
    
    try {
      const result = await AccountService.importFromBrowser(browserType);
      setImportResult(result);
      
      if (result.success && result.imported > 0) {
        onSuccess(result.imported);
      }
    } catch (err) {
      console.error(`Failed to import from ${browserType}:`, err);
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  // Gets list of detected browsers to display
  const getDetectedBrowsers = () => {
    if (!availableBrowsers) return [];
    
    return Object.entries(availableBrowsers)
      .filter(([_, isAvailable]) => isAvailable)
      .map(([browserType]) => browserType);
  };

  // Close handler with confirmation if needed
  const handleClose = () => {
    // If in the middle of an import, confirm first
    if (importing) {
      if (window.confirm('An import is in progress. Are you sure you want to cancel?')) {
        onClose();
      }
      return;
    }
    
    onClose();
  };

  // Render content based on state
  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (importing) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Importing passwords, please wait...</Typography>
        </Box>
      );
    }

    if (importResult) {
      return (
        <Box sx={{ py: 2 }}>
          {importResult.success ? (
            <Box>
              <Typography variant="h6" color="success.main" gutterBottom>
                Import Successful
              </Typography>
              <Typography>
                Successfully imported {importResult.imported} passwords.
              </Typography>
              
              {(importResult.duplicates && importResult.duplicates > 0) && (
                <Typography sx={{ mt: 1 }}>
                  Skipped {importResult.duplicates} duplicate entries.
                </Typography>
              )}
              
              {(importResult.errors && importResult.errors > 0) && (
                <Typography sx={{ mt: 1 }} color="warning.main">
                  Encountered {importResult.errors} errors during import.
                </Typography>
              )}
            </Box>
          ) : (
            <Typography color="error.main">
              Import failed: {importResult.error}
            </Typography>
          )}
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ py: 2 }}>
          <Typography color="error.main">{error}</Typography>
        </Box>
      );
    }

    const detectedBrowsers = getDetectedBrowsers();

    return (
      <Box>
        <Typography gutterBottom>
          To import passwords, first export your passwords from your browser to a CSV file, 
          then select your browser below and choose the exported file.
        </Typography>
        
        {detectedBrowsers.length > 0 ? (
          <List>
            {detectedBrowsers.map((browserType) => (
              <ListItem key={browserType} disablePadding>
                <ListItemButton 
                  onClick={() => handleBrowserImport(browserType)}
                  disabled={importing}
                >
                  <ListItemIcon>
                    {getBrowserIcon(browserType)}
                  </ListItemIcon>
                  <ListItemText primary={getBrowserDisplayName(browserType)} />
                </ListItemButton>
              </ListItem>
            ))}
            
            <Divider sx={{ my: 2 }} />
            
            <ListItem disablePadding>
              <ListItemButton 
                onClick={() => handleBrowserImport('csv')}
                disabled={importing}
              >
                <ListItemIcon>
                  <UploadFileIcon />
                </ListItemIcon>
                <ListItemText primary="Import from CSV file" secondary="Any password manager export" />
              </ListItemButton>
            </ListItem>
          </List>
        ) : (
          <Box sx={{ py: 2 }}>
            <Typography color="text.secondary" gutterBottom>
              No browsers were automatically detected on your system.
            </Typography>
            
            <Button 
              variant="contained" 
              startIcon={<UploadFileIcon />}
              onClick={() => handleBrowserImport('csv')}
              sx={{ mt: 2 }}
            >
              Import from CSV file
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Import Passwords</DialogTitle>
      
      <DialogContent>
        {renderContent()}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleClose} 
          color="primary"
          disabled={importing}
        >
          {importResult ? 'Close' : 'Cancel'}
        </Button>
        
        {importResult && (
          <Button 
            onClick={() => {
              setImportResult(null);
              setError(null);
            }}
            color="primary"
            variant="contained"
          >
            Import More
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;