const { ipcMain } = require('electron');
const windowManager = require('../utils/windowManager');
const logger = require('../utils/logger');

// Constants for zoom functionality
const ZOOM_INCREMENT = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;

/**
 * Register UI-related handlers for IPC communication
 */
function registerUIHandlers() {
  // Track zoom level
  let currentZoomFactor = 1.0;
  
  // Zoom in
  ipcMain.handle('zoom-in', () => {
    try {
      if (currentZoomFactor < MAX_ZOOM) {
        currentZoomFactor = Math.min(currentZoomFactor + ZOOM_INCREMENT, MAX_ZOOM);
        windowManager.setZoomFactor(currentZoomFactor);
        logger.info(`Zoom in: new factor ${currentZoomFactor}`);
        return { success: true, zoomFactor: currentZoomFactor };
      }
      return { success: false, error: 'Maximum zoom level reached' };
    } catch (error) {
      logger.error('Failed to zoom in', error);
      return { success: false, error: error.message };
    }
  });

  // Zoom out
  ipcMain.handle('zoom-out', () => {
    try {
      if (currentZoomFactor > MIN_ZOOM) {
        currentZoomFactor = Math.max(currentZoomFactor - ZOOM_INCREMENT, MIN_ZOOM);
        windowManager.setZoomFactor(currentZoomFactor);
        logger.info(`Zoom out: new factor ${currentZoomFactor}`);
        return { success: true, zoomFactor: currentZoomFactor };
      }
      return { success: false, error: 'Minimum zoom level reached' };
    } catch (error) {
      logger.error('Failed to zoom out', error);
      return { success: false, error: error.message };
    }
  });

  // Get zoom level
  ipcMain.handle('get-zoom-level', () => {
    return { success: true, zoomFactor: currentZoomFactor };
  });
  
  // Handle user activity (to reset the auto-lock timer)
  ipcMain.on('user-activity', () => {
    // This is forwarded to session manager in the main.js
  });
}

module.exports = { registerUIHandlers };