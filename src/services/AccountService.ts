import { Account } from '../types/Account';
import '../types/ElectronAPI'; // Import for type augmentation
import { SecurityQuestionAnswer } from '../types/SecurityQuestion';

// Interface for TOTP settings
export interface TOTPSettings {
  enabled: boolean;
  secret: string | null;
}

// Interface for TOTP setup result
export interface TOTPSetupResult {
  success: boolean;
  secret?: string;
  qrCode?: string;
  manualEntryKey?: string;
  error?: string;
}

export class AccountService {
  // Check if the database exists
  static async databaseExists(): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot check database existence');
      return false;
    }

    try {
      console.log('Checking if database exists...');
      const result = await window.api.invoke('database-exists', null);
      console.log('Database existence check result:', result);
      return result.exists;
    } catch (error) {
      console.error('Failed to check database existence:', error);
      return false;
    }
  }

  // Check if TOTP is enabled without requiring full database initialization
  static async checkTOTPEnabled(): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot check TOTP status');
      return false;
    }

    try {
      console.log('Checking TOTP status without requiring initialization...');
      const result = await window.api.invoke('check-totp-enabled', null);
      console.log('TOTP status check result:', result);
      
      return result.success && result.enabled;
    } catch (error) {
      console.error('Failed to check TOTP status:', error);
      return false;
    }
  }

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

  // Authenticate with either password or TOTP code
  static async authenticate(credential: string): Promise<{ success: boolean; method?: 'password' | 'totp' }> {
    if (!window.api) {
      console.error('Electron API not available - cannot authenticate');
      return { success: false };
    }

    try {
      console.log('Authenticating...');
      const result = await window.api.invoke('authenticate', credential);
      console.log('Authentication result:', result);
      
      return { 
        success: result.success,
        method: result.method
      };
    } catch (error) {
      console.error('Failed to authenticate:', error);
      return { success: false };
    }
  }

  // Enhanced authentication method to also return if key update is required
  static async authenticateWithDetails(credential: string): Promise<{ 
    success: boolean; 
    method?: 'password' | 'totp';
    updateKeyRequired?: boolean;
  }> {
    if (!window.api) {
      console.error('Electron API not available - cannot authenticate with details');
      return { success: false };
    }

    try {
      console.log('Authenticating with details...');
      const result = await window.api.invoke('authenticate', credential);
      console.log('Authentication with details result:', result);
      
      return { 
        success: result.success,
        method: result.method,
        updateKeyRequired: result.updateKeyRequired
      };
    } catch (error) {
      console.error('Failed to authenticate with details:', error);
      return { success: false };
    }
  }

  // Get TOTP settings
  static async getTOTPSettings(): Promise<TOTPSettings | null> {
    if (!window.api) {
      console.error('Electron API not available - cannot get TOTP settings');
      return null;
    }

    try {
      console.log('Getting TOTP settings...');
      const result = await window.api.invoke('get-totp-settings', null);
      console.log('Get TOTP settings result:', result);
      
      if (result.success) {
        return result.settings;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get TOTP settings:', error);
      return null;
    }
  }

  // Enable TOTP and get QR code
  static async enableTOTP(): Promise<TOTPSetupResult> {
    if (!window.api) {
      console.error('Electron API not available - cannot enable TOTP');
      return { success: false, error: 'Electron API not available' };
    }

    try {
      console.log('Enabling TOTP...');
      const result = await window.api.invoke('enable-totp', null);
      console.log('Enable TOTP result:', result);
      
      if (result.success) {
        return {
          success: true,
          secret: result.secret,
          qrCode: result.qrCode,
          manualEntryKey: result.manualEntryKey
        };
      }
      
      return { 
        success: false,
        error: result.error || 'Failed to enable TOTP'
      };
    } catch (error) {
      console.error('Failed to enable TOTP:', error);
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Disable TOTP
  static async disableTOTP(): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot disable TOTP');
      return false;
    }

    try {
      console.log('Disabling TOTP...');
      const result = await window.api.invoke('disable-totp', null);
      console.log('Disable TOTP result:', result);
      
      return result.success;
    } catch (error) {
      console.error('Failed to disable TOTP:', error);
      return false;
    }
  }

  // Verify TOTP code
  static async verifyTOTPCode(token: string): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot verify TOTP code');
      return false;
    }

    try {
      console.log('Verifying TOTP code...');
      const result = await window.api.invoke('verify-totp', token);
      console.log('Verify TOTP code result:', result);
      
      return result.success;
    } catch (error) {
      console.error('Failed to verify TOTP code:', error);
      return false;
    }
  }
  
  /**
   * Set master password after TOTP authentication
   * This is needed because TOTP authentication doesn't set up the correct encryption key for account operations
   */
  static async setMasterPasswordAfterTOTP(password: string): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot set master password after TOTP');
      return false;
    }

    try {
      console.log('Setting master password after TOTP authentication...');
      const result = await window.api.invoke('set-master-password-after-totp', password);
      console.log('Set master password after TOTP result:', result);
      
      return result.success;
    } catch (error) {
      console.error('Failed to set master password after TOTP:', error);
      return false;
    }
  }
  
  // Set up a new database with password and security questions
  static async setupDatabase(
    password: string, 
    securityQuestions: SecurityQuestionAnswer[]
  ): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot set up database');
      return false;
    }

    try {
      console.log('Setting up new database...');
      console.log('Security questions to be sent:', JSON.stringify(securityQuestions));
      
      // Validate security questions before sending
      if (!securityQuestions || !Array.isArray(securityQuestions) || securityQuestions.length === 0) {
        console.error('Invalid security questions format');
        return false;
      }
      
      // Ensure each question has an ID and answer
      for (const q of securityQuestions) {
        if (!q.questionId || typeof q.answer !== 'string' || q.answer.trim() === '') {
          console.error('Invalid question or answer:', q);
          return false;
        }
      }
      
      const result = await window.api.invoke('setup-database', {
        password,
        securityQuestions
      });
      
      console.log('Database setup result:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to set up database:', error);
      return false;
    }
  }

  // Get security questions for password recovery
  static async getSecurityQuestions(): Promise<number[] | null> {
    if (!window.api) {
      console.error('Electron API not available - cannot get security questions');
      return null;
    }

    try {
      console.log('Getting security questions...');
      const result = await window.api.invoke('get-security-questions', null);
      console.log('Get security questions result:', result);
      if (result.success) {
        return result.questionIds;
      }
      return null;
    } catch (error) {
      console.error('Failed to get security questions:', error);
      return null;
    }
  }

  // Verify security question answers for password recovery
  static async verifySecurityAnswers(
    questionAnswers: SecurityQuestionAnswer[]
  ): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot verify security answers');
      return false;
    }

    try {
      console.log('Verifying security answers...');
      const result = await window.api.invoke('verify-security-answers', questionAnswers);
      console.log('Verify security answers result:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to verify security answers:', error);
      return false;
    }
  }

  // Reset password using security questions
  static async resetPasswordWithSecurityAnswers(
    newPassword: string,
    questionAnswers: SecurityQuestionAnswer[]
  ): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot reset password');
      return false;
    }

    try {
      console.log('Resetting password with security answers...');
      const result = await window.api.invoke('reset-password', {
        newPassword,
        questionAnswers
      });
      console.log('Reset password result:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to reset password:', error);
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

  // Add a method to check if the last error was due to an invalid password
  static async wasLastErrorInvalidPassword(): Promise<boolean> {
    if (!window.api) {
      console.error('Electron API not available - cannot check last error');
      return false;
    }

    try {
      const result = await window.api.invoke('get-last-error', null);
      return result.isInvalidPassword || false;
    } catch (error) {
      console.error('Failed to check last error:', error);
      return false;
    }
  }
}

export default AccountService;
