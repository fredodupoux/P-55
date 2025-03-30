/**
 * This file contains the implementation for fixing TOTP authentication issues
 * It should be imported in main.js
 */
const { ipcMain } = require('electron');

// Register the handler for setting master password after TOTP authentication
function registerTOTPFixHandlers(database) {
  ipcMain.handle('set-master-password-after-totp', async (event, password) => {
    try {
      if (!database) {
        console.error('Cannot set master password after TOTP: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      console.log('Setting master password after TOTP authentication...');
      const result = await database.setMasterPasswordAfterTOTP(password);
      return { success: true };
    } catch (error) {
      console.error('Failed to set master password after TOTP:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerTOTPFixHandlers };
