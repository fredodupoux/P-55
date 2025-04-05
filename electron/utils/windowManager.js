const { BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const logger = require('./logger');

/**
 * Window Manager for creating and managing application windows
 */
class WindowManager {
  constructor() {
    this.mainWindow = null;
  }
  
  /**
   * Create the main application window
   * @param {Object} options - Options for window creation
   * @param {Object} options.preloadPath - Path to preload script
   * @param {Function} options.onClosed - Callback for window close event
   * @param {Function} options.onUserActivity - Callback for user activity
   * @returns {BrowserWindow} The created window
   */
  createMainWindow(options = {}) {
    const { preloadPath, onClosed, onUserActivity } = options;
    
    // Create the browser window with senior-friendly dimensions
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath || path.join(__dirname, '..', 'preload.js')
      }
    });

    // Set window to maximize by default for full screen interface
    // this.mainWindow.maximize();

    // Load the index.html from React dev server or the built file
    const startUrl = isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(process.resourcesPath, '..', 'build/index.html')}`;
    
    logger.info(`Loading app from: ${startUrl}`);
    
    this.mainWindow.loadURL(startUrl);

    // Open DevTools in development mode
    if (isDev) {
      this.mainWindow.webContents.openDevTools();
      logger.info('DevTools opened (development mode)');
    }

    // Handle window close event
    this.mainWindow.on('closed', () => {
      logger.info('Main window closed');
      this.mainWindow = null;
      if (onClosed) onClosed();
    });
    
    // Handle window focus
    if (onUserActivity) {
      this.mainWindow.on('focus', onUserActivity);
    }
    
    return this.mainWindow;
  }
  
  /**
   * Get the main window instance
   * @returns {BrowserWindow|null} The main window or null if not created
   */
  getMainWindow() {
    return this.mainWindow;
  }
  
  /**
   * Send a message to the renderer process
   * @param {string} channel - IPC channel
   * @param {...any} args - Arguments to send
   */
  send(channel, ...args) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }
  
  /**
   * Set the zoom factor for the main window
   * @param {number} factor - Zoom factor
   */
  setZoomFactor(factor) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.setZoomFactor(factor);
    }
  }
  
  /**
   * Reload the main window
   * @returns {boolean} True if window was reloaded, false otherwise
   */
  reload() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.reload();
      return true;
    }
    return false;
  }
}

module.exports = new WindowManager();