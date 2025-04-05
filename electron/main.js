const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Utils
const logger = require('./utils/logger');
const windowManager = require('./utils/windowManager');
const sessionManager = require('./utils/sessionManager');

// Database
const database = require('./database');
const { registerTOTPFixHandlers } = require('./main-totp-fix');

// IPC Handlers
const { registerAuthHandlers } = require('./ipc/authHandlers');
const { registerAccountHandlers } = require('./ipc/accountHandlers');
const { registerTOTPHandlers } = require('./ipc/totpHandlers');
const { registerDatabaseHandlers } = require('./ipc/databaseHandlers');
const { registerBrowserImportHandlers } = require('./ipc/browserImportHandlers');
const { registerUIHandlers } = require('./ipc/uiHandlers');

// Optimize SQLite3 loading on Windows
if (process.platform === 'win32' && process.resourcesPath) {
  try {
    // On Windows, try to use the SQLite3 module from extraResources
    process.env.SQLITE3_BINARY_PATH = require('path').join(process.resourcesPath, 'sqlite3', 'node_sqlite3.node');
    console.log('Set SQLite3 binary path for Windows:', process.env.SQLITE3_BINARY_PATH);
  } catch (err) {
    console.error('Failed to set SQLite3 binary path:', err);
  }
}

/**
 * Main application entry point
 */
async function main() {
  try {
    // Initialize the logger with user data path
    const userDataPath = app.getPath('userData');
    logger.initialize(userDataPath);
    
    // Log app start
    logger.info(`Application started - Version: ${app.getVersion()}`);
    logger.info(`User data path: ${userDataPath}`);
    logger.info(`Log path: ${logger.getLogFile()}`);
    
    // When the app is ready, create the window and initialize handlers
    app.whenReady().then(async () => {
      logger.info('Electron app is ready');
      logger.info(`App path: ${app.getAppPath()}`);
      
      // Ensure user data directories exist
      ensureUserDirectories(userDataPath);
      
      // Initialize the database
      try {
        await database.init(app);
        logger.info('Database initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize database', error);
      }
      
      // Create the main window
      const mainWindow = windowManager.createMainWindow({
        preloadPath: path.join(__dirname, 'preload.js'),
        onClosed: () => {
          database.close();
        },
        onUserActivity: () => {
          // This is called when the window gets focus
          if (sessionManager.isInitialized()) {
            sessionManager.resetAuthTimeout(null, database);
          }
        }
      });
      
      // Initialize IPC handlers
      initializeIPC();
      
      // Set up auto-updater events
      setupAutoUpdater();
      
      // Forward user activity events from renderer to session manager
      ipcMain.on('user-activity', () => {
        if (sessionManager.isInitialized()) {
          sessionManager.resetAuthTimeout(null, database);
        }
      });
    });
    
    // App lifecycle event handlers
    setupAppEvents();
    
  } catch (error) {
    logger.error('Failed to initialize app', error);
  }
}

/**
 * Ensure all necessary directories exist
 * @param {string} userDataPath - Path to the user data directory
 */
function ensureUserDirectories(userDataPath) {
  // Create directories if they don't exist
  const directories = [
    path.join(userDataPath, 'database'),
    path.join(userDataPath, 'backups')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      } catch (error) {
        logger.error(`Failed to create directory ${dir}`, error);
      }
    }
  });
}

/**
 * Setup application event handlers
 */
function setupAppEvents() {
  // Handle app before update/uninstall
  app.on('will-quit', () => {
    // Ensure database is closed properly
    database.close();
    logger.info('Application will quit, database closed');
  });
  
  app.on('window-all-closed', () => {
    logger.info('All windows closed');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  
  app.on('activate', () => {
    logger.info('App activated');
    if (!windowManager.getMainWindow()) {
      windowManager.createMainWindow({
        preloadPath: path.join(__dirname, 'preload.js'),
        onClosed: () => {
          database.close();
        },
        onUserActivity: () => {
          if (sessionManager.isInitialized()) {
            sessionManager.resetAuthTimeout(null, database);
          }
        }
      });
    }
  });
}

/**
 * Setup auto-updater
 */
function setupAutoUpdater() {
  autoUpdater.on('update-available', () => {
    windowManager.send('update-available');
  });

  autoUpdater.on('update-downloaded', () => {
    windowManager.send('update-ready');
  });

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify().catch(err => {
    logger.error('Auto-updater error:', err);
  });
}

/**
 * Initialize all IPC handlers
 */
function initializeIPC() {
  try {
    logger.info('Initializing IPC handlers');
    
    // Register TOTP fix handlers
    registerTOTPFixHandlers(database);
    logger.info('Registered TOTP fix handlers');
    
    // Register account management handlers
    registerAccountHandlers(database);
    logger.info('Registered account handlers');
    
    // Register authentication handlers
    registerAuthHandlers(database);
    logger.info('Registered auth handlers');
    
    // Register TOTP handlers
    registerTOTPHandlers(database);
    logger.info('Registered TOTP handlers');
    
    // Register database management handlers
    registerDatabaseHandlers(database);
    logger.info('Registered database handlers');
    
    // Register browser import handlers
    registerBrowserImportHandlers(database);
    logger.info('Registered browser import handlers');
    
    // Register UI-related handlers
    registerUIHandlers();
    logger.info('Registered UI handlers');
    
    logger.info('All IPC handlers registered successfully');
  } catch (error) {
    logger.error('Failed to initialize IPC handlers', error);
  }
}

// Start the application
main();
