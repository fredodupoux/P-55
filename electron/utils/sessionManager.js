const logger = require('./logger');
const windowManager = require('./windowManager');

/**
 * Session Manager handles authentication state and timeouts
 */
class SessionManager {
  constructor() {
    this.isDbInitialized = false;
    this.lastError = {
      message: '',
      isInvalidPassword: false
    };
    this.authTimeoutId = null;
    this.AUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  }
  
  /**
   * Check if database is initialized
   * @returns {boolean} Database initialization state
   */
  isInitialized() {
    return this.isDbInitialized;
  }
  
  /**
   * Set database initialization state
   * @param {boolean} state - New initialization state
   */
  setInitialized(state) {
    this.isDbInitialized = state;
  }
  
  /**
   * Get the last error that occurred
   * @returns {Object} Last error with message and type
   */
  getLastError() {
    return this.lastError;
  }
  
  /**
   * Set the last error
   * @param {string} message - Error message
   * @param {boolean} isInvalidPassword - Whether error is related to invalid password
   */
  setLastError(message, isInvalidPassword = false) {
    this.lastError = {
      message: message || '',
      isInvalidPassword: isInvalidPassword
    };
  }
  
  /**
   * Clear the last error
   */
  clearLastError() {
    this.lastError = {
      message: '',
      isInvalidPassword: false
    };
  }
  
  /**
   * Start the authentication timeout
   * @param {Function} onTimeout - Callback to execute on timeout
   * @param {Object} database - Database instance for closing connection
   */
  startAuthTimeout(onTimeout, database) {
    // Clear any existing timeout
    this.clearAuthTimeout();
    
    // Start new timeout
    this.authTimeoutId = setTimeout(() => {
      // Lock the application after timeout
      windowManager.send('lock-application');
      if (database && typeof database.close === 'function') {
        database.close();
      }
      this.isDbInitialized = false;
      logger.info('Application auto-locked due to inactivity');
      
      if (onTimeout && typeof onTimeout === 'function') {
        onTimeout();
      }
    }, this.AUTH_TIMEOUT_MS);
    
    // Tell the renderer to start tracking user activity
    windowManager.send('start-activity-monitoring');
  }
  
  /**
   * Reset the authentication timeout
   * @param {Function} onTimeout - Callback to execute on timeout
   * @param {Object} database - Database instance for closing connection
   */
  resetAuthTimeout(onTimeout, database) {
    this.startAuthTimeout(onTimeout, database);
  }
  
  /**
   * Clear the authentication timeout
   */
  clearAuthTimeout() {
    if (this.authTimeoutId) {
      clearTimeout(this.authTimeoutId);
      this.authTimeoutId = null;
    }
  }
  
  /**
   * Set the authentication timeout duration
   * @param {number} milliseconds - Timeout duration in milliseconds
   */
  setAuthTimeoutDuration(milliseconds) {
    if (typeof milliseconds === 'number' && milliseconds > 0) {
      this.AUTH_TIMEOUT_MS = milliseconds;
      logger.info(`Auth timeout duration set to ${milliseconds}ms`);
    }
  }
  
  /**
   * Get the authentication timeout duration
   * @returns {number} Timeout duration in milliseconds
   */
  getAuthTimeoutDuration() {
    return this.AUTH_TIMEOUT_MS;
  }
}

module.exports = new SessionManager();