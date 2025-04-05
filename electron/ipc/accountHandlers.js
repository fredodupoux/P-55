const { ipcMain } = require('electron');
const sessionManager = require('../utils/sessionManager');
const logger = require('../utils/logger');

/**
 * Register account management handlers for IPC communication
 * @param {Object} database - Database instance
 */
function registerAccountHandlers(database) {
  // Get all accounts
  ipcMain.handle('get-accounts', async () => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot get accounts: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Getting all accounts...');
      const accounts = await database.getAccounts();
      return { success: true, accounts };
    } catch (error) {
      logger.error('Failed to get accounts:', error);
      return { success: false, error: error.message };
    }
  });

  // Add new account
  ipcMain.handle('add-account', async (event, accountData) => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot add account: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Adding new account...');
      const account = await database.addAccount(accountData);
      return { success: true, account };
    } catch (error) {
      logger.error('Failed to add account:', error);
      return { success: false, error: error.message };
    }
  });

  // Update existing account
  ipcMain.handle('update-account', async (event, accountData) => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot update account: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Updating account...');
      const account = await database.updateAccount(accountData);
      return { success: true, account };
    } catch (error) {
      logger.error('Failed to update account:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete account
  ipcMain.handle('delete-account', async (event, id) => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot delete account: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Deleting account...');
      await database.deleteAccount(id);
      return { success: true, id };
    } catch (error) {
      logger.error('Failed to delete account:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerAccountHandlers };