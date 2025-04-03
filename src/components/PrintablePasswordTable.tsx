import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from '@mui/material';
import { forwardRef } from 'react';
import { Account } from '../types/Account';

interface PrintablePasswordTableProps {
  accounts: Account[];
  includePasswords: boolean;
  includeNotes: boolean;
}

const PrintablePasswordTable = forwardRef<HTMLDivElement, PrintablePasswordTableProps>(
  ({ accounts, includePasswords, includeNotes }, ref) => {
    // Format date to a readable string
    const formatDate = (timestamp?: number) => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleDateString();
    };

    // Sort accounts by name for a more organized list
    const sortedAccounts = [...accounts].sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    return (
      <div ref={ref} style={{ padding: '20px', backgroundColor: 'white' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" align="center" sx={{ mb: 1 }}>
            Password List
          </Typography>
          <Typography variant="subtitle1" align="center" sx={{ mb: 3 }}>
            Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
          </Typography>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Website/App</strong></TableCell>
                <TableCell><strong>Username/Email</strong></TableCell>
                {includePasswords && (
                  <TableCell><strong>Password</strong></TableCell>
                )}
                <TableCell><strong>URL</strong></TableCell>
                {includeNotes && (
                  <TableCell><strong>Notes</strong></TableCell>
                )}
                <TableCell><strong>Last Modified</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.username}</TableCell>
                  {includePasswords && (
                    <TableCell 
                      style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.9rem' 
                      }}
                    >
                      {account.password}
                    </TableCell>
                  )}
                  <TableCell>{account.url || account.website || ''}</TableCell>
                  {includeNotes && (
                    <TableCell style={{ 
                      whiteSpace: 'pre-wrap',
                      maxWidth: '200px'
                    }}>
                      {account.notes}
                    </TableCell>
                  )}
                  <TableCell>{formatDate(account.lastModified)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" align="center" sx={{ fontStyle: 'italic' }}>
            Keep this document in a secure location.
          </Typography>
        </Box>
      </div>
    );
  }
);

export default PrintablePasswordTable;