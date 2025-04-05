const { ipcMain } = require('electron');
const qrcode = require('qrcode');
const sessionManager = require('../utils/sessionManager');
const logger = require('../utils/logger');

/**
 * Register TOTP handlers for IPC communication
 * @param {Object} database - Database instance
 */
function registerTOTPHandlers(database) {
  // Get TOTP settings
  ipcMain.handle('get-totp-settings', async () => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot get TOTP settings: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Getting TOTP settings...');
      const settings = await database.getTOTPSettings();
      
      return { success: true, settings };
    } catch (error) {
      logger.error('Failed to get TOTP settings:', error);
      return { success: false, error: error.message };
    }
  });

  // Check TOTP status without requiring full database initialization
  ipcMain.handle('check-totp-enabled', async () => {
    try {
      logger.info('Checking if TOTP is enabled without full database initialization');
      
      // Check if the database file exists
      const dbPath = database.dbPath;
      const exists = database.exists();
      
      if (!exists) {
        logger.info('Database does not exist, TOTP cannot be enabled');
        return { success: true, enabled: false };
      }
      
      // Use a temporary connection to check TOTP status
      const totpStatus = await database.checkTOTPWithoutInitialization();
      logger.info('TOTP status checked:', totpStatus);
      
      return { 
        success: true, 
        enabled: totpStatus.enabled 
      };
    } catch (error) {
      logger.error('Failed to check TOTP status:', error);
      return { success: false, error: error.message, enabled: false };
    }
  });

  // Enable TOTP
  ipcMain.handle('enable-totp', async () => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot enable TOTP: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Enabling TOTP...');
      const result = await database.enableTOTP();
      
      if (result.success && result.secret) {
        // Generate QR code for the secret
        const appName = 'P+55';
        const otpAuthUrl = `otpauth://totp/${appName}?secret=${result.secret}&issuer=${appName}`;
        
        const qrCode = await qrcode.toDataURL(otpAuthUrl);
        
        return { 
          success: true, 
          secret: result.secret, 
          qrCode,
          manualEntryKey: result.secret 
        };
      }
      
      return { success: false, error: 'Failed to enable TOTP' };
    } catch (error) {
      logger.error('Failed to enable TOTP:', error);
      return { success: false, error: error.message };
    }
  });

  // Disable TOTP
  ipcMain.handle('disable-totp', async () => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot disable TOTP: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Disabling TOTP...');
      const success = await database.disableTOTP();
      
      return { success };
    } catch (error) {
      logger.error('Failed to disable TOTP:', error);
      return { success: false, error: error.message };
    }
  });

  // Verify TOTP code
  ipcMain.handle('verify-totp', async (event, token) => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot verify TOTP: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Verifying TOTP code...');
      const isValid = await database.verifyTOTPCode(token);
      
      if (isValid) {
        // Reset the auto-lock timer
        sessionManager.resetAuthTimeout(null, database);
      }
      
      return { success: isValid };
    } catch (error) {
      logger.error('Failed to verify TOTP code:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerTOTPHandlers };