/**
 * This file contains the implementation for fixing TOTP authentication issues
 * It should be added to the Database class in database.js
 */

/**
 * Sets the master key after TOTP authentication.
 * This method accepts the actual master password to derive the correct encryption key.
 * 
 * @param {string} masterPassword - The master password for encryption
 * @returns {Promise<Object>} - Result of the operation
 */
function setMasterPasswordAfterTOTP(masterPassword) {
  return new Promise((resolve, reject) => {
    if (!this.db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    // Verify the provided master password first
    this.verifyMasterPassword(masterPassword)
      .then(isValid => {
        if (!isValid) {
          reject(new Error('Invalid master password'));
          return;
        }
        
        // Compute the proper master key as in password authentication
        this.masterKey = require('crypto')
          .createHash('sha256')
          .update(masterPassword)
          .digest('hex');
        
        console.log('Master password successfully set after TOTP authentication');
        resolve({ success: true });
      })
      .catch(error => {
        console.error('Error setting master key after TOTP:', error);
        reject(error);
      });
  });
}

// Modified authenticate method to not set masterKey when using TOTP
function authenticate(credential) {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if credential is possibly a TOTP code (typically 6-8 digits)
      const isTOTPCode = /^\d{6,8}$/.test(credential);
      
      if (isTOTPCode) {
        const isValid = await this.verifyTOTPCode(credential);
        
        if (isValid) {
          // Instead of setting an incorrect masterKey, indicate that the proper
          // key needs to be set with the master password
          resolve({ 
            success: true, 
            method: 'totp', 
            updateKeyRequired: true 
          });
        } else {
          console.log('TOTP verification failed');
          resolve({ 
            success: false, 
            method: 'totp', 
            error: 'Invalid TOTP code' 
          });
        }
      } else {
        // Handle password authentication as before
        const isValid = await this.verifyMasterPassword(credential);
        
        if (isValid) {
          this.masterKey = require('crypto')
            .createHash('sha256')
            .update(credential)
            .digest('hex');
          
          resolve({ success: true, method: 'password' });
        } else {
          resolve({ 
            success: false, 
            method: 'password', 
            error: 'Invalid password' 
          });
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      reject(error);
    }
  });
}

module.exports = {
  setMasterPasswordAfterTOTP,
  authenticate
};
