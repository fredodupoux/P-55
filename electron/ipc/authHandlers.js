const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const sessionManager = require('../utils/sessionManager');
const logger = require('../utils/logger');

/**
 * Register authentication handlers for IPC communication
 * @param {Object} database - Database instance
 */
function registerAuthHandlers(database) {
  // Initialize database with password
  ipcMain.handle('initialize-db', async (event, password) => {
    try {
      logger.info('Initializing database with password...');
      if (!password || typeof password !== 'string' || password.length < 1) {
        const error = 'Invalid password provided';
        logger.error(error);
        sessionManager.setLastError(error, true);
        return { success: false, error };
      }
      
      const result = await database.initialize(password);
      sessionManager.setInitialized(true);
      logger.info('Database initialization successful');
      // Clear last error on success
      sessionManager.clearLastError();
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize database', error);
      // Track if this is an invalid password error
      const isInvalidPassword = error.message && error.message.includes('Invalid master password');
      sessionManager.setLastError(error.message, isInvalidPassword);
      
      // Return a more detailed error message to help debugging
      return { 
        success: false, 
        error: error.message,
        details: error.stack,
        isInvalidPassword: isInvalidPassword
      };
    }
  });

  // Handle authentication (both password and TOTP)
  ipcMain.handle('authenticate', async (event, credential) => {
    try {
      // Clear any previous error
      sessionManager.clearLastError();
      
      // Check if this is possibly a TOTP code (numeric and 6-8 digits)
      const isTOTPCode = /^\d{6,9}$/.test(credential);
      
      if (isTOTPCode) {
        // For TOTP, we need to check if it's enabled and valid, even if DB isn't initialized
        logger.info('Attempting TOTP authentication without full database initialization');
        
        // Use a special method to verify TOTP without requiring full DB initialization
        const result = await database.verifyTOTPWithoutInitialization(credential);
        
        if (result.success) {
          // If TOTP is valid, then initialize the database properly without password
          logger.info('TOTP verification successful, initializing database properly');
          await database.initializeAfterTOTP();
          
          // Start auto-lock timer
          sessionManager.startAuthTimeout(null, database);
          sessionManager.setInitialized(true);
          return { success: true, method: 'totp' };
        } else {
          // Set specific error message for TOTP failure
          sessionManager.setLastError(result.error || 'Invalid verification code');
          return { 
            success: false, 
            error: result.error || 'Invalid verification code',
            method: 'totp'
          };
        }
      } else {
        // Handle regular password authentication
        
        // Check if the database has been initialized already
        if (!sessionManager.isInitialized()) {
          // If not, initialize it with the password
          await database.initialize(credential);
        }
        
        // Then authenticate with password
        const result = await database.authenticate(credential);
        
        if (result.success) {
          // Start auto-lock timer
          sessionManager.startAuthTimeout(null, database);
          sessionManager.setInitialized(true);
          return { success: true, method: result.method };
        } else {
          // Set a more specific error message for password failure
          sessionManager.setLastError(result.error || 'Invalid master password', true);
          return { 
            success: false, 
            error: result.error || 'Invalid master password',
            method: 'password'
          };
        }
      }
    } catch (error) {
      logger.error('Authentication error:', error);
      
      // Store the error for future reference
      sessionManager.setLastError(error.message, error.message.includes('Invalid master password'));
      
      return { success: false, error: error.message };
    }
  });

  // Verify master password
  ipcMain.handle('verify-password', async (event, password) => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot verify password: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Verifying master password...');
      const isValid = await database.verifyMasterPassword(password);
      logger.info('Password verification result:', isValid);
      return { success: isValid };
    } catch (error) {
      logger.error('Failed to verify password:', error);
      return { success: false, error: error.message };
    }
  });

  // Check if database exists
  ipcMain.handle('database-exists', async () => {
    try {
      // Check if the database file exists
      const dbPath = database.dbPath;
      const exists = fs.existsSync(dbPath);
      
      logger.info(`Database existence check: ${exists ? 'exists' : 'does not exist'} at ${dbPath}`);
      return { success: true, exists };
    } catch (error) {
      logger.error('Failed to check database existence', error);
      return { success: false, error: error.message, exists: false };
    }
  });

  // Setup database with password and security questions
  ipcMain.handle('setup-database', async (event, { password, securityQuestions }) => {
    try {
      logger.info('Setting up new database with password and security questions');
      logger.info(`Security questions received: ${JSON.stringify(securityQuestions)}`);
      
      if (!password || typeof password !== 'string' || password.length < 1) {
        const error = 'Invalid password provided';
        logger.error(error);
        return { success: false, error };
      }
      
      if (!securityQuestions || !Array.isArray(securityQuestions)) {
        const error = 'Security questions must be an array';
        logger.error(error);
        return { success: false, error };
      }
      
      if (securityQuestions.length === 0) {
        const error = 'At least one security question is required';
        logger.error(error);
        return { success: false, error };
      }
      
      // Validate each security question
      for (const question of securityQuestions) {
        if (!question.questionId || question.questionId === 0) {
          logger.error(`Invalid question ID: ${question.questionId}`);
          return { success: false, error: 'Invalid question ID provided' };
        }
        
        if (!question.answer || typeof question.answer !== 'string' || question.answer.trim() === '') {
          logger.error('Empty answer provided for a security question');
          return { success: false, error: 'All security questions must have answers' };
        }
      }
      
      const result = await database.setup(password, securityQuestions);
      sessionManager.setInitialized(true);
      logger.info('Database setup successful');
      return { success: true };
    } catch (error) {
      logger.error('Failed to set up database', error);
      return { 
        success: false, 
        error: error.message,
        details: error.stack
      };
    }
  });

  // Change master password
  ipcMain.handle('change-master-password', async (event, { currentPassword, newPassword }) => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot change password: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Changing master password...');
      await database.changeMasterPassword(currentPassword, newPassword);
      logger.info('Master password changed successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to change master password:', error);
      return { success: false, error: error.message };
    }
  });

  // Get security questions
  ipcMain.handle('get-security-questions', async () => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot get security questions: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Getting security questions...');
      const questionIds = await database.getSecurityQuestionIds();
      return { success: true, questionIds };
    } catch (error) {
      logger.error('Failed to get security questions:', error);
      return { success: false, error: error.message };
    }
  });

  // Verify security answers
  ipcMain.handle('verify-security-answers', async (event, questionAnswers) => {
    try {
      if (!sessionManager.isInitialized()) {
        logger.error('Cannot verify security answers: Database not initialized');
        return { success: false, error: 'Database not initialized' };
      }
      
      logger.info('Verifying security question answers...');
      const isValid = await database.verifySecurityAnswers(questionAnswers);
      return { success: isValid };
    } catch (error) {
      logger.error('Failed to verify security answers:', error);
      return { success: false, error: error.message };
    }
  });

  // Reset password with security answers
  ipcMain.handle('reset-password', async (event, { newPassword, questionAnswers }) => {
    try {
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 1) {
        logger.error('Invalid new password provided');
        return { success: false, error: 'Invalid new password provided' };
      }
      
      if (!questionAnswers || !Array.isArray(questionAnswers) || questionAnswers.length === 0) {
        logger.error('Invalid security answers provided');
        return { success: false, error: 'Invalid security answers provided' };
      }
      
      logger.info('Resetting password with security answers...');
      const result = await database.resetPasswordWithSecurityAnswers(newPassword, questionAnswers);
      
      if (result) {
        // Successfully reset password
        logger.info('Password reset successful');
        return { success: true };
      } else {
        logger.error('Failed to reset password: Security answers may be incorrect');
        return { success: false, error: 'Failed to reset password' };
      }
    } catch (error) {
      logger.error('Failed to reset password:', error);
      return { success: false, error: error.message };
    }
  });

  // Get the last error
  ipcMain.handle('get-last-error', () => {
    return sessionManager.getLastError();
  });
}

module.exports = { registerAuthHandlers };