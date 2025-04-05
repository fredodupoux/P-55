const { ipcMain, dialog } = require('electron');
const { detectBrowsers, importFromBrowser } = require('../browser-import');
const windowManager = require('../utils/windowManager');
const sessionManager = require('../utils/sessionManager');
const logger = require('../utils/logger');

/**
 * Register browser import handlers for IPC communication
 * @param {Object} database - Database instance
 */
function registerBrowserImportHandlers(database) {
  // Get available browsers
  ipcMain.handle('get-available-browsers', async () => {
    try {
      logger.info('get-available-browsers handler called');
      const browsers = await detectBrowsers();
      return { success: true, browsers };
    } catch (error) {
      const errorMessage = `Get available browsers error: ${error.message}`;
      logger.error(errorMessage, error);
      sessionManager.setLastError(errorMessage);
      return { success: false, error: error.message, browsers: {} };
    }
  });
  
  // Import from browser
  ipcMain.handle('import-from-browser', async (event, { browserType, importOptions = { handleDuplicates: 'skip', createCategory: true } }) => {
    try {
      logger.info(`import-from-browser handler called for browser type: ${browserType} with options: ${JSON.stringify(importOptions)}`);
      if (!browserType) {
        return { success: false, imported: 0, error: 'Browser type not specified' };
      }
      
      const mainWindow = windowManager.getMainWindow();
      const result = await importFromBrowser(browserType, database, dialog, mainWindow, importOptions);
      return result;
    } catch (error) {
      const errorMessage = `Failed to import from browser: ${error.message}`;
      logger.error(errorMessage, error);
      sessionManager.setLastError(errorMessage);
      return { 
        success: false, 
        imported: 0, 
        error: error.message || `Failed to import from ${browserType}`
      };
    }
  });
}

module.exports = { registerBrowserImportHandlers };