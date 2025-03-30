import { Account } from '../types/Account';
import '../types/ElectronAPI'; // Import for type augmentation

export class AccountService {
  // Initialize the database with the master password
  static async initialize(password: string): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot initialize database');
      return false;
    }

    try {
      console.log('Initializing database...');
      const result = await window.api.invoke('initialize-db', password);
      console.log('Database initialization result:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      return false;
    }
  }

  // Verify the master password
  static async verifyPassword(password: string): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot verify password');
      return false;
    }

    try {
      console.log('Verifying password...');
      const result = await window.api.invoke('verify-password', password);
      console.log('Password verification result:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to verify password:', error);
      return false;
    }
  }

  // Change the master password
  static async changeMasterPassword(currentPassword: string, newPassword: string): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot change master password');
      return false;
    }

    try {
      console.log('Changing master password...');
      const result = await window.api.invoke('change-master-password', { currentPassword, newPassword });
      console.log('Change master password result:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to change master password:', error);
      return false;
    }
  }

  // Get all accounts from the database
  static async getAccounts(): Promise<Account[]> {
    if (!window.api) {
      console.error('Electron API not available - cannot get accounts');
      return [];
    }

    try {
      console.log('Getting accounts...');
      const result = await window.api.invoke('get-accounts', null);
      console.log('Get accounts result:', result);
      if (result.success) {
        return result.accounts;
      }
      console.warn('Failed to get accounts:', result.error);
      return [];
    } catch (error) {
      console.error('Error getting accounts:', error);
      return [];
    }
  }

  // Add a new account to the database
  static async addAccount(account: Omit<Account, 'id'>): Promise<Account | null> {
    if (!window.api) {
      console.error('Electron API not available - cannot add account');
      return null;
    }

    try {
      console.log('Adding account:', account.name);
      const result = await window.api.invoke('add-account', account);
      console.log('Add account result:', result);
      if (result.success) {
        return result.account;
      }
      console.warn('Failed to add account:', result.error);
      return null;
    } catch (error) {
      console.error('Error adding account:', error);
      return null;
    }
  }

  // Update an existing account in the database
  static async updateAccount(account: Account): Promise<Account | null> {
    if (!window.api) {
      console.error('Electron API not available - cannot update account');
      return null;
    }

    try {
      console.log('Updating account:', account.id);
      const result = await window.api.invoke('update-account', account);
      console.log('Update account result:', result);
      if (result.success) {
        return result.account;
      }
      console.warn('Failed to update account:', result.error);
      return null;
    } catch (error) {
      console.error('Error updating account:', error);
      return null;
    }
  }

  // Delete an account from the database
  static async deleteAccount(id: number): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot delete account');
      return false;
    }

    try {
      console.log('Deleting account:', id);
      const result = await window.api.invoke('delete-account', id);
      console.log('Delete account result:', result);
      return result.success;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  }

  // Create a manual backup of the database
  static async createBackup(): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot create backup');
      return false;
    }

    try {
      console.log('Creating database backup...');
      const result = await window.api.invoke('create-backup', null);
      console.log('Backup result:', result);
      return result.success;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }

  // Get the database file path
  static async getDatabasePath(): Promise<string | null> {
    if (!window.api) {
      console.error('Electron API not available - cannot get database path');
      return null;
    }

    try {
      const result = await window.api.invoke('get-database-path', null);
      if (result.success) {
        return result.path;
      }
      return null;
    } catch (error) {
      console.error('Error getting database path:', error);
      return null;
    }
  }

  // Get application logs
  static async getLogs(): Promise<string | null> {
    if (!window.api) {
      console.error('Electron API not available - cannot get logs');
      return null;
    }

    try {
      const result = await window.api.invoke('get-logs', null);
      if (result.success) {
        return result.logs;
      }
      console.warn('Failed to get logs:', result.error);
      return null;
    } catch (error) {
      console.error('Error getting logs:', error);
      return null;
    }
  }

  // Show the database folder in the file explorer
  static async showDatabaseFolder(): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot show database folder');
      return false;
    }

    try {
      const result = await window.api.invoke('show-database-folder', null);
      return result.success;
    } catch (error) {
      console.error('Error showing database folder:', error);
      return false;
    }
  }
}

export default AccountService;
