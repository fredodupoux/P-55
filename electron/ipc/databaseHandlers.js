const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');
const path = require('path');
const sessionManager = require('../utils/sessionManager');
const logger = require('../utils/logger');

/**
 * Register database management handlers for IPC communication
 * @param {Object} database - Database instance
 */
function registerDatabaseHandlers(database) {
  // Create backup
  ipcMain.handle('create-backup', async () => {
    try {
      if (!sessionManager.isInitialized()) {
        throw new Error('Database not initialized');
      }
      
      database.createBackup();
      return { success: true };
    } catch (error) {
      logger.error('Failed to create backup:', error);
      return { success: false, error: error.message };
    }
  });

  // Create backup to custom location
  ipcMain.handle('create-backup-custom-location', async () => {
    try {
      if (!sessionManager.isInitialized()) {
        throw new Error('Database not initialized');
      }
      
      // Show a dialog to let the user choose where to save the backup
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Database Backup',
        defaultPath: path.join(app.getPath('documents'), `p55-backup-${new Date().toISOString().replace(/:/g, '-')}.db`),
        buttonLabel: 'Save Backup',
        filters: [
          { name: 'Database Files', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (canceled || !filePath) {
        return { success: false, error: 'Backup canceled by user' };
      }
      
      // Create a copy of the database file in the selected location
      const dbPath = database.dbPath;
      if (!fs.existsSync(dbPath)) {
        throw new Error('Database file does not exist');
      }
      
      fs.copyFileSync(dbPath, filePath);
      logger.info(`Custom backup created at: ${filePath}`);
      
      return { success: true, path: filePath };
    } catch (error) {
      logger.error('Failed to create custom backup', error);
      return { success: false, error: error.message };
    }
  });

  // Restore database from backup
  ipcMain.handle('restore-database-backup', async () => {
    try {
      // Show a dialog to let the user choose a backup file to restore
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Restore Database Backup',
        defaultPath: app.getPath('documents'),
        buttonLabel: 'Restore',
        filters: [
          { name: 'Database Files', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (canceled || filePaths.length === 0) {
        return { success: false, error: 'Restore canceled by user' };
      }
      
      // Close the database connection if it's open
      if (sessionManager.isInitialized()) {
        database.close();
        sessionManager.setInitialized(false);
      }
      
      const backupPath = filePaths[0];
      const dbPath = database.dbPath;
      
      // Create a backup of the current database before restoring
      if (fs.existsSync(dbPath)) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const preRestoreBackup = path.join(path.dirname(dbPath), `pre-restore-backup-${timestamp}.db`);
        fs.copyFileSync(dbPath, preRestoreBackup);
        logger.info(`Created pre-restore backup at: ${preRestoreBackup}`);
      }
      
      // Copy the selected backup file to the database location
      fs.copyFileSync(backupPath, dbPath);
      logger.info(`Restored database from backup: ${backupPath}`);
      
      return { success: true, path: backupPath };
    } catch (error) {
      logger.error('Failed to restore database backup', error);
      return { success: false, error: error.message };
    }
  });

  // Get database path
  ipcMain.handle('get-database-path', async () => {
    try {
      return { 
        success: true, 
        path: database.dbPath
      };
    } catch (error) {
      logger.error('Failed to get database path:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Show the folder containing the database
  ipcMain.handle('show-database-folder', async () => {
    try {
      const dbDir = path.dirname(database.dbPath);
      // Open the folder in the file explorer
      const opened = await dialog.showOpenDialog({
        defaultPath: dbDir,
        properties: ['openDirectory']
      });
      return { success: true, result: opened };
    } catch (error) {
      logger.error('Failed to show database folder', error);
      return { success: false, error: error.message };
    }
  });

  // Get logs
  ipcMain.handle('get-logs', async () => {
    try {
      return await logger.getRecentLogs();
    } catch (error) {
      logger.error('Failed to get logs', error);
      return { success: false, error: error.message };
    }
  });
  
  // Restart app (refresh window)
  ipcMain.handle('restart-app', async () => {
    try {
      const windowManager = require('../utils/windowManager');
      logger.info('Performing hard refresh of application window');
      
      if (windowManager.reload()) {
        return { success: true };
      } else {
        throw new Error('Main window not available');
      }
    } catch (error) {
      logger.error('Failed to refresh application window', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerDatabaseHandlers };