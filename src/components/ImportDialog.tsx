import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import AccountService, { AvailableBrowsers, BrowserImportResult } from '../services/AccountService';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: BrowserImportResult) => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onSuccess }) => {
  // Available browsers state
  const [availableBrowsers, setAvailableBrowsers] = useState<AvailableBrowsers>({
    chrome: false,
    firefox: false,
    safari: false,
    edge: false,
    brave: false,
    opera: false,
    csv: false
  });
  
  // Selected browser
  const [selectedBrowser, setSelectedBrowser] = useState<string>('');
  
  // Duplicate handling option
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'overwrite' | 'keep'>('skip');
  
  // Create category option
  const [createCategory, setCreateCategory] = useState<boolean>(true);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Error message
  const [error, setError] = useState<string | null>(null);
  
  // Check which browsers are available on component mount
  useEffect(() => {
    const checkAvailableBrowsers = async () => {
      setIsLoading(true);
      try {
        const browsers = await AccountService.getAvailableBrowsers();
        console.log('Available browsers:', browsers);
        setAvailableBrowsers(browsers);
        
        // Auto-select the first available browser or CSV if no browsers available
        let foundBrowser = false;
        for (const [browser, available] of Object.entries(browsers)) {
          if (available) {
            setSelectedBrowser(browser);
            foundBrowser = true;
            break;
          }
        }
        
        if (!foundBrowser) {
          setSelectedBrowser('csv');
        }
      } catch (err) {
        console.error('Error checking available browsers:', err);
        setError('Failed to detect available browsers.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (open) {
      checkAvailableBrowsers();
    }
  }, [open]);
  
  const handleImport = async () => {
    if (!selectedBrowser) {
      setError('Please select a browser or CSV file to import from');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const options = {
        handleDuplicates: duplicateHandling,
        createCategory
      };
      
      const result = await AccountService.importFromBrowser(selectedBrowser, options);
      
      if (result.success) {
        onSuccess(result);
        onClose();
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err) {
      console.error('Error during import:', err);
      setError(err instanceof Error ? err.message : 'Unknown error during import');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };
  
  // Format browser name for display
  const formatBrowserName = (name: string): string => {
    if (name === 'csv') return 'CSV File';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };
  
  // Count available browsers
  const availableBrowserCount = Object.values(availableBrowsers).filter(Boolean).length;
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Import Passwords</DialogTitle>
      <DialogContent>
        {isLoading && !selectedBrowser ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {availableBrowserCount === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No supported browsers detected on your system. You can still import from a CSV file.
              </Alert>
            ) : (
              <Typography variant="body1" gutterBottom sx={{ mt: 1 }}>
                Import passwords from web browsers installed on your computer or a CSV file.
              </Typography>
            )}
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="browser-select-label">Select Source</InputLabel>
              <Select
                labelId="browser-select-label"
                value={selectedBrowser}
                label="Select Source"
                onChange={(e) => setSelectedBrowser(e.target.value)}
                disabled={isLoading}
              >
                {/* CSV option is always available */}
                {/* <MenuItem key="csv" value="csv">
                  CSV File
                </MenuItem> */}
                
                {/* Dynamic browser options */}
                {Object.entries(availableBrowsers).map(([browser, available]) => (
                  available && (
                    <MenuItem key={browser} value={browser}>
                      {formatBrowserName(browser)}
                    </MenuItem>
                  )
                ))}
              </Select>
              <FormHelperText>
                {selectedBrowser === 'csv' 
                  ? 'Import passwords from a CSV file (common export format for most password managers)'
                  : 'Choose the browser to import passwords from'}
              </FormHelperText>
            </FormControl>
            
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Duplicate Handling
            </Typography>
            
            <RadioGroup
              value={duplicateHandling}
              onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'overwrite' | 'keep')}
            >
              <FormControlLabel 
                value="skip" 
                control={<Radio />} 
                label="Skip duplicates (recommended)" 
                disabled={isLoading}
              />
              <FormControlLabel 
                value="overwrite" 
                control={<Radio />} 
                label="Overwrite existing entries" 
                disabled={isLoading}
              />
              <FormControlLabel 
                value="keep" 
                control={<Radio />} 
                label="Keep both (create duplicates)" 
                disabled={isLoading}
              />
            </RadioGroup>
            
            <FormGroup sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={createCategory}
                    onChange={(e) => setCreateCategory(e.target.checked)}
                    disabled={isLoading}
                  />
                }
                label={`Create ${selectedBrowser !== 'csv' ? selectedBrowser : 'CSV import'} category for imported passwords`}
              />
            </FormGroup>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          onClick={handleImport} 
          variant="contained" 
          color="primary" 
          disabled={isLoading || !selectedBrowser}
          startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
        >
          {isLoading ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;