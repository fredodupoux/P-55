import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    Paper,
    Typography
} from '@mui/material';
import React, { useState } from 'react';
import { Account } from '../types/Account';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
}

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose, accounts }) => {
  const [includePasswords, setIncludePasswords] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  
  const toggleIncludePasswords = () => {
    if (!includePasswords) {
      // Show warning when enabling passwords
      setShowWarning(true);
    }
    setIncludePasswords(!includePasswords);
  };
  
  const handleExportCSV = () => {
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
    
    // Automatically close the dialog after successful export
    onClose();
  };
  
  return (
    <Dialog 
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogTitle>Export Password List</DialogTitle>
      
      <DialogContent dividers>
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
        
        <DialogContentText paragraph>
          Select the information you want to include in the exported CSV file:
        </DialogContentText>
        
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
          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
            The export dialog will close automatically after the file is downloaded.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          startIcon={<FileDownloadIcon />}
          onClick={handleExportCSV}
          color="primary"
        >
          Export CSV
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;