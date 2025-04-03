// Import required modules
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { app } = require('electron');

// Better SQLite3 loading with multiple fallback mechanisms
let sqlite3;
try {
  // First try the normal way
  sqlite3 = require('sqlite3');
  console.log('SQLite3 loaded successfully via standard require');
} catch (mainErr) {
  console.warn('Failed to load SQLite3 normally:', mainErr.message);
  
  try {
    // For packaged apps, try the unpacked location
    const isProduction = app.isPackaged;
    const appPath = app.getAppPath();
    
    // Different paths based on environment
    let modulePath;
    if (isProduction) {
      // In production, native modules should be unpacked
      const resourcesPath = process.resourcesPath;
      const unpacked = 'app.asar.unpacked';
      modulePath = path.join(resourcesPath, unpacked, 'node_modules', 'sqlite3');
      console.log('Trying SQLite3 at production path:', modulePath);
    } else {
      // In development, use normal node_modules path
      modulePath = path.join(appPath, 'node_modules', 'sqlite3');
      console.log('Trying SQLite3 at development path:', modulePath);
    }
    
    // Try to load from determined path
    sqlite3 = require(modulePath);
    console.log('SQLite3 loaded successfully via explicit path');
  } catch (pathErr) {
    console.error('Failed to load SQLite3 from explicit path:', pathErr.message);
    
    try {
      // One final approach - try a relative path
      const relativePath = path.join(__dirname, '..', 'node_modules', 'sqlite3');
      console.log('Trying SQLite3 at relative path:', relativePath);
      sqlite3 = require(relativePath);
      console.log('SQLite3 loaded successfully via relative path');
    } catch (relErr) {
      console.error('All SQLite3 loading approaches failed:', relErr.message);
      
      // Create a dummy DB object with methods that throw meaningful errors
      const createErrorFn = (methodName) => () => {
        throw new Error(`SQLite3 is not available: ${methodName} cannot be used. Database is not functional.`);
      };
      
      // Mock with error-throwing methods to avoid undefined errors
      sqlite3 = {
        Database: class MockDatabase {
          constructor() { 
            throw new Error('SQLite3 module could not be loaded. Database operations will not work.');
          }
        },
        verbose: () => sqlite3
      };
      
      // Throw a clear error - this will be caught in the main process
      throw new Error('Could not load SQLite3 module. Database operations will not work.');
    }
  }
}

// Use verbose mode for better logging
sqlite3 = sqlite3.verbose();

// Add otplib for TOTP support
const { authenticator } = require('otplib');

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Configure TOTP
authenticator.options = {
  digits: 6,
  window: 1, // Allow codes from 1 step before and after current time
};

class Database {
  constructor() {
    // Store database in user data directory, which is outside of app resources
    this.userDataPath = null;
    
    // Database paths will be set in init method
    this.dbDir = null;
    this.dbPath = null;
    this.db = null;
    this.masterKey = null;
  }

  // New init method to set up paths without reassigning the module
  init(appInstance) {
    return new Promise((resolve, reject) => {
      try {
        console.log('Initializing database paths and directories');
        
        if (!appInstance) {
          console.error('App instance not provided to database.init()');
          reject(new Error('App instance not provided'));
          return;
        }
        
        // Store database in user data directory, which is outside of app resources
        this.userDataPath = appInstance.getPath('userData');
        
        // Create a dedicated database directory
        this.dbDir = path.join(this.userDataPath, 'database');
        
        console.log('Database directory path:', this.dbDir);
        
        try {
          if (!fs.existsSync(this.dbDir)) {
            fs.mkdirSync(this.dbDir, { recursive: true });
            console.log('Created database directory');
          }
        } catch (error) {
          console.error('Error creating database directory:', error);
          reject(error);
          return;
        }
        
        // Store the database file in the user data directory
        this.dbPath = path.join(this.dbDir, 'pass55.db');
        console.log('Database file path:', this.dbPath);
        
        // Periodically backup the database
        this.setupAutomaticBackup();
        
        resolve(true);
      } catch (error) {
        console.error('Database init error:', error);
        reject(error);
      }
    });
  }
  
  // Create backup system for the database
  setupAutomaticBackup() {
    // Create backups directory if it doesn't exist
    const backupDir = path.join(this.userDataPath, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('Created backups directory');
    }
    
    // Define backup function
    this.createBackup = () => {
      if (!this.db || !fs.existsSync(this.dbPath)) return;
      
      try {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const backupPath = path.join(backupDir, `pass55-backup-${timestamp}.db`);
        
        // Create a copy of the database file
        fs.copyFileSync(this.dbPath, backupPath);
        console.log(`Created database backup at: ${backupPath}`);
        
        // Remove old backups (keep only last 5)
        const backupFiles = fs.readdirSync(backupDir)
          .filter(file => file.startsWith('pass55-backup-'))
          .sort()
          .reverse();
        
        if (backupFiles.length > 5) {
          const filesToDelete = backupFiles.slice(5);
          filesToDelete.forEach(file => {
            fs.unlinkSync(path.join(backupDir, file));
            console.log(`Deleted old backup: ${file}`);
          });
        }
      } catch (error) {
        console.error('Error creating database backup:', error);
      }
    };
    
    // Create a backup at initialization and then every 24 hours
    this.backupInterval = setInterval(() => this.createBackup(), 24 * 60 * 60 * 1000);
  }
  
  // Check if database exists
  exists() {
    return fs.existsSync(this.dbPath);
  }

  // Initialize the database with encryption key
  initialize(masterPassword) {
    return new Promise((resolve, reject) => {
      try {
        console.log('Initializing database...');
        
        // Check if we were called with a valid password
        if (!masterPassword || typeof masterPassword !== 'string' || masterPassword.length < 1) {
          console.error('Invalid master password provided for initialization');
          reject(new Error('Invalid master password provided'));
          return;
        }
        
        // Use master password to derive a key
        this.masterKey = crypto
          .createHash('sha256')
          .update(masterPassword)
          .digest('hex');
        
        // Check if the database file already exists
        const dbExists = fs.existsSync(this.dbPath);
        console.log(`Database file ${dbExists ? 'exists' : 'does not exist'} at: ${this.dbPath}`);
        
        // Open database with better error handling
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('Error opening database:', err.message);
            reject(err);
            return;
          }
          console.log('Connected to the SQLite database');
          
          // For TOTP authentication, we need to securely store the original master password
          // but in an encrypted form that we can recover
          this._initializeTables(masterPassword, dbExists, resolve, reject);
        });
      } catch (error) {
        console.error('Error during database initialization:', error);
        reject(error);
      }
    });
  }

  // Initialize database tables (separate method for cleaner code)
  _initializeTables(masterPassword, dbExists, resolve, reject) {
    this.db.serialize(() => {
      // First create a master password verification table to ensure the database
      // can only be opened with the correct password
      this.db.run(`
        CREATE TABLE IF NOT EXISTS master_verification (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          verification_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating verification table:', err.message);
          reject(err);
          return;
        }
        
        // Create TOTP table for two-factor authentication
        this.db.run(`
          CREATE TABLE IF NOT EXISTS totp_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            secret TEXT,
            enabled INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating TOTP table:', err.message);
            reject(err);
            return;
          }
          
          // Check if a verification record exists
          this.db.get('SELECT * FROM master_verification WHERE id = 1', (err, row) => {
            if (err) {
              console.error('Error checking master verification:', err.message);
              reject(err);
              return;
            }
            
            // Generate a verification hash using a separate salt
            const salt = crypto.randomBytes(16).toString('hex');
            const verificationHash = crypto
              .createHash('sha256')
              .update(masterPassword + salt)
              .digest('hex');
            
            if (!row) {
              console.log('First time setup - storing verification hash');
              // First time setup - store verification hash
              this.db.run(
                'INSERT INTO master_verification (id, verification_hash, salt) VALUES (1, ?, ?)',
                [verificationHash, salt],
                (err) => {
                  if (err) {
                    console.error('Error storing verification hash:', err.message);
                    reject(err);
                    return;
                  }
                  console.log('Stored master password verification');
                  
                  // Initialize TOTP settings with disabled state
                  this.db.run(
                    'INSERT OR IGNORE INTO totp_settings (id, enabled) VALUES (1, 0)',
                    [],
                    (err) => {
                      if (err) {
                        console.error('Error initializing TOTP settings:', err.message);
                        // Non-critical error, continue
                      }
                      this._createAccountsTable(resolve, reject);
                    }
                  );
                }
              );
            } else {
              // Verify the provided password matches the stored hash
              const storedHash = row.verification_hash;
              const storedSalt = row.salt;
              const testHash = crypto
                .createHash('sha256')
                .update(masterPassword + storedSalt)
                .digest('hex');
              
              if (testHash !== storedHash) {
                console.error('Invalid master password');
                reject(new Error('Invalid master password'));
                return;
              }
              console.log('Master password verified');
              this._createAccountsTable(resolve, reject);
            }
          });
        });
      });
    });
  }

  // Create the accounts table
  _createAccountsTable(resolve, reject) {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        website TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating accounts table:', err.message);
        reject(err);
        return;
      }
      console.log('Database initialized successfully');
      
      // Create a backup after successful initialization
      this.createBackup();
      
      resolve(true);
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      console.log('Closing database connection');
      
      // Create a backup before closing
      this.createBackup();
      
      // Clear backup interval
      if (this.backupInterval) {
        clearInterval(this.backupInterval);
        this.backupInterval = null;
      }
      
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
      });
      this.db = null;
      this.masterKey = null;
    }
  }

  // Encrypt sensitive data
  encrypt(text) {
    if (!this.masterKey) throw new Error('Database not initialized with a key');
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.masterKey, 'hex').slice(0, 32), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  // Decrypt sensitive data
  decrypt(encryptedText) {
    if (!this.masterKey) throw new Error('Database not initialized with a key');
    
    const [ivHex, encrypted] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.masterKey, 'hex').slice(0, 32), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Get all accounts
  getAccounts() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      this.db.all('SELECT * FROM accounts ORDER BY name', (err, rows) => {
        if (err) {
          console.error('Error getting accounts:', err.message);
          reject(err);
          return;
        }
        
        console.log(`Retrieved ${rows?.length || 0} accounts`);
        
        // If no rows, return empty array
        if (!rows || rows.length === 0) {
          resolve([]);
          return;
        }
        
        try {
          // Decrypt sensitive data
          const accounts = rows.map(row => ({
            id: row.id,
            name: row.name,
            username: row.username,
            password: this.decrypt(row.password),
            website: row.website || '',
            notes: row.notes || '',
          }));
          
          resolve(accounts);
        } catch (error) {
          console.error('Error processing accounts:', error);
          reject(error);
        }
      });
    });
  }

  // Add a new account
  addAccount(accountData) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      const { name, username, password, website, notes } = accountData;
      const encryptedPassword = this.encrypt(password);
      
      console.log('Adding new account:', name);
      
      // Capture createBackup function with bound context
      const createBackupFn = this.createBackup.bind(this);
      
      this.db.run(
        `INSERT INTO accounts (name, username, password, website, notes) 
         VALUES (?, ?, ?, ?, ?)`,
        [name, username, encryptedPassword, website, notes],
        function(err) {
          if (err) {
            console.error('Error adding account:', err.message);
            reject(err);
            return;
          }
          
          console.log('Account added with ID:', this.lastID);
          
          // Use the captured function instead of this.createBackup
          setTimeout(createBackupFn, 1000);
          
          resolve({
            id: this.lastID,
            name,
            username,
            password,
            website,
            notes
          });
        }
      );
    });
  }

  // Update an existing account
  updateAccount(accountData) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      const { id, name, username, password, website, notes } = accountData;
      const encryptedPassword = this.encrypt(password);
      
      console.log('Updating account ID:', id);
      
      // Capture createBackup function with bound context
      const createBackupFn = this.createBackup.bind(this);
      
      this.db.run(
        `UPDATE accounts 
         SET name = ?, username = ?, password = ?, website = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name, username, encryptedPassword, website, notes, id],
        (err) => {
          if (err) {
            console.error('Error updating account:', err.message);
            reject(err);
            return;
          }
          
          console.log('Account updated successfully');
          
          // Use the captured function
          setTimeout(createBackupFn, 1000);
          
          resolve(accountData);
        }
      );
    });
  }

  // Delete an account
  deleteAccount(id) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('Database not initialized');
        reject(new Error('Database not initialized'));
        return;
      }
      
      console.log('Deleting account ID:', id);
      
      // Capture createBackup function with bound context
      const createBackupFn = this.createBackup.bind(this);
      
      this.db.run('DELETE FROM accounts WHERE id = ?', [id], (err) => {
        if (err) {
          console.error('Error deleting account:', err.message);
          reject(err);
          return;
        }
        
        console.log('Account deleted successfully');
        
        // Use the captured function
        setTimeout(createBackupFn, 1000);
        
        resolve({ success: true, id });
      });
    });
  }

  // Verify the master password
  verifyMasterPassword(password) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      // Get the stored verification hash and salt
      this.db.get('SELECT * FROM master_verification WHERE id = 1', (err, row) => {
        if (err) {
          console.error('Error checking master verification:', err.message);
          reject(err);
          return;
        }
        
        if (!row) {
          // No verification record exists yet
          resolve(true); // First time use
          return;
        }
        
        // Verify against stored hash and salt
        const storedHash = row.verification_hash;
        const storedSalt = row.salt;
        const testHash = crypto
          .createHash('sha256')
          .update(password + storedSalt)
          .digest('hex');
        
        resolve(testHash === storedHash);
      });
    });
  }
  
  // Change the master password
  changeMasterPassword(currentPassword, newPassword) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.db) {
          reject(new Error('Database not initialized'));
          return;
        }
        
        this.verifyMasterPassword(currentPassword)
          .then(isValid => {
            if (!isValid) {
              reject(new Error('Current password is incorrect'));
              return;
            }
            
            // Get all existing accounts
            this.getAccounts().then(accounts => {
              // Generate a new salt and hash for verification
              const salt = crypto.randomBytes(16).toString('hex');
              const verificationHash = crypto
                .createHash('sha256')
                .update(newPassword + salt)
                .digest('hex');
              
              // Generate new master key
              const newMasterKey = crypto
                .createHash('sha256')
                .update(newPassword)
                .digest('hex');
              
              // Update the verification record
              this.db.run(
                'UPDATE master_verification SET verification_hash = ?, salt = ? WHERE id = 1',
                [verificationHash, salt],
                async (err) => {
                  if (err) {
                    console.error('Error updating verification record:', err);
                    reject(err);
                    return;
                  }
                  
                  // Store old master key and update the current one
                  const oldMasterKey = this.masterKey;
                  this.masterKey = newMasterKey;
                  
                  // Re-encrypt all passwords with the new master key
                  try {
                    for (const account of accounts) {
                      const updatedAccount = {
                        ...account,
                        password: account.password // Already decrypted by getAccounts
                      };
                      await this.updateAccount(updatedAccount);
                    }
                    
                    console.log('Master password changed successfully');
                    this.createBackup();
                    resolve(true);
                  } catch (error) {
                    // Restore old master key if re-encryption fails
                    this.masterKey = oldMasterKey;
                    console.error('Error re-encrypting accounts:', error);
                    reject(error);
                  }
                }
              );
            }).catch(error => {
              console.error('Error getting accounts for re-encryption:', error);
              reject(error);
            });
          })
          .catch(error => {
            console.error('Error verifying current password:', error);
            reject(error);
          });
      } catch (error) {
        console.error('Error changing master password:', error);
        reject(error);
      }
    });
  }

  // Extended setup method to include security questions
  setup(password, securityQuestions) {
    return new Promise((resolve, reject) => {
      try {
        console.log('Setting up new database...');
        
        // Check if we were called with a valid password
        if (!password || typeof password !== 'string' || password.length < 1) {
          console.error('Invalid master password provided for setup');
          reject(new Error('Invalid master password provided'));
          return;
        }
        
        // Validate security questions
        if (!securityQuestions || !Array.isArray(securityQuestions) || securityQuestions.length === 0) {
          console.error('Invalid security questions provided for setup');
          reject(new Error('Invalid security questions provided'));
          return;
        }
        
        // Use master password to derive a key
        this.masterKey = crypto
          .createHash('sha256')
          .update(password)
          .digest('hex');
        
        // Check if the database file already exists - it shouldn't if this is setup
        const dbExists = fs.existsSync(this.dbPath);
        if (dbExists) {
          console.warn('Database file already exists during setup');
          // We'll proceed anyway, but log a warning
        }
        
        // Open database with better error handling
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('Error opening database:', err.message);
            reject(err);
            return;
          }
          console.log('Connected to the SQLite database for setup');
          
          // Proceed with initialization...
          this._setupDatabase(password, securityQuestions, resolve, reject);
        });
      } catch (error) {
        console.error('Error during database setup:', error);
        reject(error);
      }
    });
  }

  // Setup database tables with security questions
  _setupDatabase(password, securityQuestions, resolve, reject) {
    this.db.serialize(() => {
      // First create a master password verification table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS master_verification (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          verification_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating verification table:', err.message);
          reject(err);
          return;
        }
        
        // Create TOTP table for two-factor authentication
        this.db.run(`
          CREATE TABLE IF NOT EXISTS totp_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            secret TEXT,
            enabled INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating TOTP table:', err.message);
            reject(err);
            return;
          }
          
          // Create security questions table
          this.db.run(`
            CREATE TABLE IF NOT EXISTS security_questions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              question_id INTEGER NOT NULL,
              answer_hash TEXT NOT NULL,
              salt TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) {
              console.error('Error creating security questions table:', err.message);
              reject(err);
              return;
            }
            
            // Generate a verification hash using a separate salt
            const salt = crypto.randomBytes(16).toString('hex');
            const verificationHash = crypto
              .createHash('sha256')
              .update(password + salt)
              .digest('hex');
            
            // Store verification hash
            this.db.run(
              'INSERT OR REPLACE INTO master_verification (id, verification_hash, salt) VALUES (1, ?, ?)',
              [verificationHash, salt],
              (err) => {
                if (err) {
                  console.error('Error storing verification hash:', err.message);
                  reject(err);
                  return;
                }
                console.log('Stored master password verification');
                
                // Clear any existing security questions
                this.db.run('DELETE FROM security_questions', (err) => {
                  if (err) {
                    console.error('Error clearing security questions:', err.message);
                    reject(err);
                    return;
                  }
                  
                  // Store security questions
                  const insertSecurity = this.db.prepare(
                    'INSERT INTO security_questions (question_id, answer_hash, salt) VALUES (?, ?, ?)'
                  );
                  
                  try {
                    securityQuestions.forEach(question => {
                      const questionSalt = crypto.randomBytes(16).toString('hex');
                      const answerHash = crypto
                        .createHash('sha256')
                        .update(question.answer + questionSalt)
                        .digest('hex');
                      
                      insertSecurity.run(question.questionId, answerHash, questionSalt);
                    });
                    
                    insertSecurity.finalize((err) => {
                      if (err) {
                        console.error('Error finalizing security questions insertion:', err.message);
                        reject(err);
                        return;
                      }
                      
                      // Create accounts table
                      this._createAccountsTable(resolve, reject);
                    });
                  } catch (error) {
                    console.error('Error inserting security questions:', error);
                    reject(error);
                  }
                });
              }
            );
          });
        });
      });
    });
  }

  // Get the IDs of stored security questions
  getSecurityQuestionIds() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      this.db.all('SELECT question_id FROM security_questions ORDER BY id', (err, rows) => {
        if (err) {
          console.error('Error getting security question IDs:', err.message);
          reject(err);
          return;
        }
        
        if (!rows || rows.length === 0) {
          console.warn('No security questions found');
          resolve([]);
          return;
        }
        
        const questionIds = rows.map(row => row.question_id);
        console.log(`Found ${questionIds.length} security questions`);
        resolve(questionIds);
      });
    });
  }

  // Verify security question answers
  verifySecurityAnswers(questionAnswers) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      if (!questionAnswers || !Array.isArray(questionAnswers) || questionAnswers.length === 0) {
        console.error('Invalid question answers format');
        resolve(false);
        return;
      }
      
      // Get all stored security questions
      this.db.all('SELECT question_id, answer_hash, salt FROM security_questions', (err, rows) => {
        if (err) {
          console.error('Error getting security questions:', err.message);
          reject(err);
          return;
        }
        
        if (!rows || rows.length === 0) {
          console.warn('No security questions found for verification');
          resolve(false);
          return;
        }
        
        try {
          // Convert rows to a map for easier lookup
          const storedQuestions = new Map();
          rows.forEach(row => {
            storedQuestions.set(row.question_id, {
              answerHash: row.answer_hash,
              salt: row.salt
            });
          });
          
          // Verify each provided answer
          let allCorrect = true;
          
          for (const qa of questionAnswers) {
            const stored = storedQuestions.get(qa.questionId);
            
            if (!stored) {
              console.warn(`Question ID ${qa.questionId} not found in database`);
              allCorrect = false;
              break;
            }
            
            // Hash the provided answer with the stored salt
            const testHash = crypto
              .createHash('sha256')
              .update(qa.answer + stored.salt)
              .digest('hex');
            
            // Compare with stored hash
            if (testHash !== stored.answerHash) {
              console.warn(`Answer incorrect for question ID ${qa.questionId}`);
              allCorrect = false;
              break;
            }
          }
          
          resolve(allCorrect);
        } catch (error) {
          console.error('Error verifying security answers:', error);
          reject(error);
        }
      });
    });
  }

  // Reset password using security question answers
  resetPasswordWithSecurityAnswers(newPassword, questionAnswers) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      // First verify the security answers
      this.verifySecurityAnswers(questionAnswers)
        .then(isValid => {
          if (!isValid) {
            console.error('Security answers verification failed');
            resolve(false);
            return;
          }
          
          // Store old master key before generating new one
          const oldMasterKey = this.masterKey;
          
          // Generate new master key and salt
          const newMasterKey = crypto
            .createHash('sha256')
            .update(newPassword)
            .digest('hex');
          
          const salt = crypto.randomBytes(16).toString('hex');
          const verificationHash = crypto
            .createHash('sha256')
            .update(newPassword + salt)
            .digest('hex');
          
          // Update the verification record
          this.db.run(
            'UPDATE master_verification SET verification_hash = ?, salt = ? WHERE id = 1',
            [verificationHash, salt],
            (err) => {
              if (err) {
                console.error('Error updating verification record:', err);
                reject(err);
                return;
              }
              
              try {
                console.log('Getting accounts with old master key');
                
                // Get accounts with the old master key first
                const getAccounts = new Promise((resolveAccounts, rejectAccounts) => {
                  this.db.all('SELECT * FROM accounts ORDER BY name', (err, rows) => {
                    if (err) {
                      console.error('Error getting accounts for re-encryption:', err.message);
                      rejectAccounts(err);
                      return;
                    }
                    
                    if (!rows || rows.length === 0) {
                      // No accounts to update
                      resolveAccounts([]);
                      return;
                    }
                    
                    try {
                      // Decrypt sensitive data with old key
                      const accounts = rows.map(row => ({
                        id: row.id,
                        name: row.name,
                        username: row.username,
                        password: this.decrypt(row.password), // Use current (old) master key
                        website: row.website || '',
                        notes: row.notes || '',
                      }));
                      
                      resolveAccounts(accounts);
                    } catch (error) {
                      console.error('Error processing accounts:', error);
                      rejectAccounts(error);
                    }
                  });
                });
                
                // Now handle the accounts update after getting them
                getAccounts.then(accounts => {
                  // Switch to the new master key
                  this.masterKey = newMasterKey;
                  
                  // Function to update each account with new encryption
                  const updateAccount = (account, index) => {
                    return new Promise((resolveUpdate, rejectUpdate) => {
                      // Encrypt with new master key
                      const encryptedPassword = this.encrypt(account.password);
                      
                      this.db.run(
                        `UPDATE accounts 
                         SET password = ?, updated_at = CURRENT_TIMESTAMP 
                         WHERE id = ?`,
                        [encryptedPassword, account.id],
                        (err) => {
                          if (err) {
                            console.error(`Error updating account ${account.id} with new encryption:`, err);
                            rejectUpdate(err);
                          } else {
                            console.log(`Re-encrypted account ${index + 1}/${accounts.length}`);
                            resolveUpdate();
                          }
                        }
                      );
                    });
                  };
                  
                  // Process accounts sequentially to avoid database locks
                  const processAccounts = async () => {
                    try {
                      for (let i = 0; i < accounts.length; i++) {
                        await updateAccount(accounts[i], i);
                      }
                      
                      console.log('Password reset successful');
                      this.createBackup();
                      resolve(true);
                    } catch (error) {
                      // If there's an error during update, restore old master key
                      this.masterKey = oldMasterKey;
                      console.error('Error updating accounts with new encryption:', error);
                      reject(error);
                    }
                  };
                  
                  // Start processing accounts
                  processAccounts();
                }).catch(error => {
                  this.masterKey = oldMasterKey; // Restore old key on error
                  console.error('Error getting accounts for password reset:', error);
                  reject(error);
                });
              } catch (error) {
                // Restore old master key if something goes wrong
                this.masterKey = oldMasterKey;
                console.error('Error re-encrypting accounts after password reset:', error);
                reject(error);
              }
            }
          );
        })
        .catch(error => {
          console.error('Error during security answers verification:', error);
          reject(error);
        });
    });
  }

  // Generate a new TOTP secret
  generateTOTPSecret() {
    return authenticator.generateSecret(); // Generates a base32 secret key
  }

  // Enable TOTP for the user
  enableTOTP() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      // Generate a new secret
      const secret = this.generateTOTPSecret();
      
      // Store it in the database
      this.db.run(
        'INSERT OR REPLACE INTO totp_settings (id, secret, enabled, updated_at) VALUES (1, ?, 1, CURRENT_TIMESTAMP)',
        [secret],
        (err) => {
          if (err) {
            console.error('Error enabling TOTP:', err);
            reject(err);
            return;
          }
          
          console.log('TOTP enabled successfully');
          resolve({ success: true, secret });
        }
      );
    });
  }

  // Disable TOTP
  disableTOTP() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      this.db.run(
        'UPDATE totp_settings SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
        [],
        (err) => {
          if (err) {
            console.error('Error disabling TOTP:', err);
            reject(err);
            return;
          }
          
          console.log('TOTP disabled successfully');
          resolve(true);
        }
      );
    });
  }

  // Get TOTP settings
  getTOTPSettings() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      this.db.get('SELECT * FROM totp_settings WHERE id = 1', (err, row) => {
        if (err) {
          console.error('Error getting TOTP settings:', err);
          reject(err);
          return;
        }
        
        if (!row) {
          // No settings yet, initialize with disabled state
          resolve({ enabled: false, secret: null });
          return;
        }
        
        resolve({
          enabled: row.enabled === 1,
          secret: row.secret
        });
      });
    });
  }

  // Verify TOTP code
  verifyTOTPCode(token) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      this.db.get('SELECT * FROM totp_settings WHERE id = 1 AND enabled = 1', (err, row) => {
        if (err) {
          console.error('Error getting TOTP settings for verification:', err);
          reject(err);
          return;
        }
        
        if (!row || !row.secret) {
          console.warn('TOTP not enabled or no secret found');
          resolve(false);
          return;
        }
        
        try {
          const isValid = authenticator.verify({ token, secret: row.secret });
          resolve(isValid);
        } catch (error) {
          console.error('Error verifying TOTP code:', error);
          reject(error);
        }
      });
    });
  }

  // Combined authentication method (password OR TOTP)
  authenticate(credential) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.db) {
          reject(new Error('Database not initialized'));
          return;
        }
        
        // Check if this is a numeric TOTP code
        const isTOTPCode = /^\d{6,9}$/.test(credential);
        
        if (isTOTPCode) {
          // First check if TOTP is enabled
          const totpSettings = await new Promise((resolveQuery, rejectQuery) => {
            this.db.get('SELECT * FROM totp_settings WHERE id = 1', (err, result) => {
              if (err) rejectQuery(err);
              else resolveQuery(result);
            });
          });
          
          if (!totpSettings || totpSettings.enabled !== 1) {
            console.log('TOTP authentication attempted but not enabled');
            resolve({ success: false, method: 'totp', error: 'TOTP not enabled' });
            return;
          }
          
          // Verify as TOTP code
          const isValid = await this.verifyTOTPCode(credential);
          
          if (isValid) {
            // Get the master password from the verification record to set up encryption
            const row = await new Promise((resolveQuery, rejectQuery) => {
              this.db.get('SELECT verification_hash, salt FROM master_verification WHERE id = 1', (err, result) => {
                if (err) rejectQuery(err);
                else resolveQuery(result);
              });
            });
            
            if (!row) {
              reject(new Error('Master verification record not found'));
              return;
            }
            
            
            // When using TOTP, the masterKey should have already been set
            // by a successful password verification step prior to TOTP check.
            // We just confirm TOTP validity here.
            
            // Authentication successful
            resolve({ success: true, method: 'totp' });
            // Important: Don't change the masterKey when TOTP fails
            console.log('TOTP verification failed');
            resolve({ success: false, method: 'totp', error: 'Invalid TOTP code' });
          }
        } else {
          // Verify as password
          const isValid = await this.verifyMasterPassword(credential);
          
          if (isValid) {
            // Set the master key based on the password for encryption/decryption
            this.masterKey = crypto
              .createHash('sha256')
              .update(credential)
              .digest('hex');
            
            resolve({ success: true, method: 'password' });
          } else {
            resolve({ success: false, method: 'password', error: 'Invalid password' });
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
        reject(error);
      }
    });
  }

  // Encrypt the database file for syncing
  async encryptDatabaseForSync() {
    if (!this.dbPath || !fs.existsSync(this.dbPath)) {
      throw new Error('Database file does not exist');
    }

    const fileBuffer = fs.readFileSync(this.dbPath);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.masterKey, 'hex').slice(0, 32),
      Buffer.alloc(16, 0) // Use a zero IV for simplicity (not recommended for production)
    );

    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    return encrypted;
  }

  // Decrypt the database file after downloading
  async decryptDatabaseFromSync(encryptedBuffer) {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.masterKey, 'hex').slice(0, 32),
      Buffer.alloc(16, 0)
    );

    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    fs.writeFileSync(this.dbPath, decrypted);
  }

  // Upload the encrypted database to the server
  async uploadDatabase() {
    try {
      const encryptedDB = await this.encryptDatabaseForSync();
      // Replace with actual API call
      console.log('Uploading encrypted database to server...');
      // Example: await apiClient.upload('/sync', encryptedDB);
    } catch (error) {
      console.error('Error uploading database:', error);
    }
  }

  // Download the encrypted database from the server
  async downloadDatabase() {
    try {
      // Replace with actual API call
      console.log('Downloading encrypted database from server...');
      const encryptedDB = Buffer.from(''); // Example: await apiClient.download('/sync');
      await this.decryptDatabaseFromSync(encryptedDB);
    } catch (error) {
      console.error('Error downloading database:', error);
    }
  }

  // Sync the database with the server
  async syncDatabase() {
    try {
      console.log('Starting database sync...');
      await this.uploadDatabase();
      await this.downloadDatabase();
      console.log('Database sync completed successfully');
    } catch (error) {
      console.error('Error during database sync:', error);
    }
  }

  // Check if TOTP is enabled without requiring full database initialization
  checkTOTPWithoutInitialization() {
    return new Promise((resolve, reject) => {
      try {
        // Create a temporary database connection directly
        const sqlite3 = require('sqlite3').verbose();
        const dbPath = this.dbPath;
        
        // Open a database connection in read-only mode
        const tempDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
          if (err) {
            console.error('Error opening database for TOTP check:', err.message);
            // If we can't open the database, assume TOTP is not enabled
            resolve({ enabled: false });
            return;
          }
          
          // Check if the TOTP table exists and if it's enabled
          tempDb.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='totp_settings'`,
            (err, table) => {
              if (err || !table) {
                // Table doesn't exist, so TOTP cannot be enabled
                tempDb.close();
                resolve({ enabled: false });
                return;
              }
              
              // Table exists, now check if TOTP is enabled
              tempDb.get('SELECT enabled FROM totp_settings WHERE id = 1', (err, row) => {
                // Close the temporary connection
                tempDb.close();
                
                if (err || !row) {
                  // Error or no settings row found
                  resolve({ enabled: false });
                  return;
                }
                
                // Return the TOTP enabled status
                resolve({ enabled: row.enabled === 1 });
              });
            }
          );
        });
      } catch (error) {
        console.error('Error checking TOTP status:', error);
        resolve({ enabled: false }); // Default to disabled on error
      }
    });
  }

  // Verify a TOTP code without requiring the database to be initialized first
  verifyTOTPWithoutInitialization(token) {
    return new Promise((resolve, reject) => {
      try {
        if (!token || !/^\d{6,9}$/.test(token)) {
          console.error('Invalid TOTP token format');
          resolve({ success: false, error: 'Invalid verification code format' });
          return;
        }
        
        // Create a temporary database connection directly
        const sqlite3 = require('sqlite3').verbose();
        const dbPath = this.dbPath;
        
        if (!fs.existsSync(dbPath)) {
          console.error('Database file does not exist, cannot verify TOTP');
          resolve({ success: false, error: 'Database does not exist' });
          return;
        }
        
        // Open a read-only connection to avoid any potential data modification
        const tempDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
          if (err) {
            console.error('Error opening database for TOTP verification:', err.message);
            resolve({ success: false, error: 'Could not open database' });
            return;
          }
          
          // First check if the TOTP table exists and TOTP is enabled
          tempDb.get(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='totp_settings'`,
            (err, table) => {
              if (err || !table) {
                // Table doesn't exist, so TOTP cannot be enabled
                tempDb.close();
                resolve({ success: false, error: 'TOTP not configured' });
                return;
              }
              
              // Table exists, check if TOTP is enabled and get the secret
              tempDb.get('SELECT * FROM totp_settings WHERE id = 1 AND enabled = 1', (err, row) => {
                if (err || !row || !row.secret) {
                  // If there's an error or TOTP is not enabled or no secret is found
                  tempDb.close();
                  resolve({ success: false, error: 'TOTP not enabled' });
                  return;
                }
                
                // We have the secret, verify the token
                try {
                  // Verify the TOTP code
                  const isValid = authenticator.verify({ token, secret: row.secret });
                  
                  // Store secret for later database initialization if verification succeeds
                  if (isValid) {
                    // Store the secret temporarily to use during initialization
                    this._tempTOTPSecret = row.secret;
                  }
                  
                  // Close the temporary connection
                  tempDb.close();
                  
                  // Return the result
                  resolve({ 
                    success: isValid, 
                    error: isValid ? null : 'Invalid verification code'
                  });
                } catch (error) {
                  tempDb.close();
                  console.error('Error during TOTP verification:', error);
                  resolve({ success: false, error: 'Verification error' });
                }
              });
            }
          );
        });
      } catch (error) {
        console.error('TOTP verification error:', error);
        resolve({ success: false, error: 'TOTP verification failed' });
      }
    });
  }

  // Initialize the database after successful TOTP authentication
  initializeAfterTOTP() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Initializing database after TOTP authentication');
        
        if (!this._tempTOTPSecret) {
          reject(new Error('No TOTP secret available for initialization'));
          return;
        }
        
        // Open the database properly
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('Error opening database after TOTP auth:', err.message);
            reject(err);
            return;
          }
          
          console.log('Database opened successfully after TOTP authentication');
          
          // Initialize with minimal setup - just enough to use the database
          // We don't set a masterKey because we don't have the password,
          // but we can still query data without encrypting/decrypting
          
          // Mark the database as TOTP-authenticated so we know not to try encrypting/decrypting
          this._totpAuthenticated = true;
          
          // Clear the temporary TOTP secret
          delete this._tempTOTPSecret;
          
          resolve(true);
        });
      } catch (error) {
        console.error('Error during post-TOTP initialization:', error);
        reject(error);
      }
    });
  }
}

module.exports = new Database();
