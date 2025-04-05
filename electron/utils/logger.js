const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Logger utility for the application
 * Provides consistent logging across the application with file output
 */
class Logger {
  constructor() {
    this.initialized = false;
    this.logDir = null;
    this.logFile = null;
    
    // Save original console methods
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };
  }
  
  /**
   * Initialize the logger with the application user data path
   * @param {string} userDataPath - The path to user data directory
   */
  initialize(userDataPath) {
    if (this.initialized) {
      return;
    }
    
    // Setup logging directory and file
    this.logDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    this.logFile = path.join(this.logDir, `app-${new Date().toISOString().slice(0, 10)}.log`);
    
    this.initialized = true;
    
    // Override console methods
    this.overrideConsoleMethods();
    
    // Log initialization
    this.info(`Logger initialized at ${this.logFile}`);
    return this.logFile;
  }
  
  /**
   * Write a log entry to the log file
   * @param {string} level - Log level (log, error, warn, info)
   * @param {string} message - Log message
   * @param {Error|null} error - Optional error object
   */
  writeToLog(level, message, error = null) {
    if (!this.initialized) {
      console.error('Logger not initialized');
      return;
    }
    
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (error) {
      logMessage += `\n  Error: ${error.message || error}`;
      if (error.stack) {
        logMessage += `\n  Stack: ${error.stack}`;
      }
    }
    
    // Use the original console methods to avoid recursion
    this.originalConsole[level.toLowerCase()](logMessage);
    
    // Write to log file
    try {
      fs.appendFileSync(this.logFile, logMessage + '\n', { encoding: 'utf8' });
    } catch (fileError) {
      // Use original console to avoid recursion
      this.originalConsole.error('Failed to write to log file:', fileError);
    }
    
    return logMessage;
  }
  
  /**
   * Override the default console methods to also write to file
   */
  overrideConsoleMethods() {
    // Store this for use in the closure
    const logger = this;
    
    console.log = (message, ...args) => {
      if (typeof message === 'object') {
        try {
          const stringified = JSON.stringify(message);
          logger.writeToLog('log', stringified);
        } catch (e) {
          logger.writeToLog('log', '[Object that cannot be stringified]');
        }
      } else {
        logger.writeToLog('log', message);
      }
      logger.originalConsole.log(message, ...args);
    };
    
    console.error = (message, ...args) => {
      if (typeof message === 'object' && !(message instanceof Error)) {
        try {
          const stringified = JSON.stringify(message);
          logger.writeToLog('error', stringified, args[0]);
        } catch (e) {
          logger.writeToLog('error', '[Object that cannot be stringified]', args[0]);
        }
      } else {
        logger.writeToLog('error', message, args[0]);
      }
      logger.originalConsole.error(message, ...args);
    };
    
    console.warn = (message, ...args) => {
      if (typeof message === 'object') {
        try {
          const stringified = JSON.stringify(message);
          logger.writeToLog('warn', stringified);
        } catch (e) {
          logger.writeToLog('warn', '[Object that cannot be stringified]');
        }
      } else {
        logger.writeToLog('warn', message);
      }
      logger.originalConsole.warn(message, ...args);
    };
    
    console.info = (message, ...args) => {
      if (typeof message === 'object') {
        try {
          const stringified = JSON.stringify(message);
          logger.writeToLog('info', stringified);
        } catch (e) {
          logger.writeToLog('info', '[Object that cannot be stringified]');
        }
      } else {
        logger.writeToLog('info', message);
      }
      logger.originalConsole.info(message, ...args);
    };
  }
  
  /**
   * Log an info message
   * @param {string} message - Message to log
   * @param {Error|null} error - Optional error object
   */
  info(message, error = null) {
    return this.writeToLog('info', message, error);
  }
  
  /**
   * Log an error message
   * @param {string} message - Message to log
   * @param {Error|null} error - Optional error object
   */
  error(message, error = null) {
    return this.writeToLog('error', message, error);
  }
  
  /**
   * Log a warning message
   * @param {string} message - Message to log
   * @param {Error|null} error - Optional error object
   */
  warn(message, error = null) {
    return this.writeToLog('warn', message, error);
  }
  
  /**
   * Log a debug message
   * @param {string} message - Message to log
   * @param {Error|null} error - Optional error object
   */
  log(message, error = null) {
    return this.writeToLog('log', message, error);
  }
  
  /**
   * Get the path to the log directory
   * @returns {string|null} - Path to the log directory
   */
  getLogDir() {
    return this.logDir;
  }
  
  /**
   * Get the path to the current log file
   * @returns {string|null} - Path to the current log file
   */
  getLogFile() {
    return this.logFile;
  }
  
  /**
   * Get the most recent log file content
   * @returns {Promise<{success: boolean, logs: string, logPath?: string, error?: string}>}
   */
  async getRecentLogs() {
    try {
      if (!this.initialized || !this.logDir) {
        return { success: false, logs: '', error: 'Logger not initialized' };
      }
      
      const logFiles = fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'))
        .sort()
        .reverse();
      
      if (logFiles.length === 0) {
        return { success: true, logs: 'No log files found' };
      }
      
      // Return the content of the most recent log file
      const latestLogFile = path.join(this.logDir, logFiles[0]);
      const logs = fs.readFileSync(latestLogFile, 'utf8');
      
      return { 
        success: true, 
        logs,
        logPath: latestLogFile
      };
    } catch (error) {
      this.error('Failed to get logs', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new Logger();