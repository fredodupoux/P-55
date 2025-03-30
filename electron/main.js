const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const database = require('./database');

// Setup logging
const userDataPath = app.getPath('userData');
const logDir = path.join(userDataPath, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, `app-${new Date().toISOString().slice(0, 10)}.log`);

// Save original console methods before overriding
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

// Create a log writer function that uses the original console methods
function writeToLog(level, message, error = null) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level}] ${message}`;
  
  if (error) {
    logMessage += `\n  Error: ${error.message || error}`;
    if (error.stack) {
      logMessage += `\n  Stack: ${error.stack}`;
    }
  }
  
  // Use the original console methods to avoid recursion
  originalConsole[level](logMessage);
  
  // Write to log file
  try {
    fs.appendFileSync(logFile, logMessage + '\n', { encoding: 'utf8' });
  } catch (fileError) {
    // Use original console to avoid recursion
    originalConsole.error('Failed to write to log file:', fileError);
  }
  
  return logMessage;
}

// Override console methods to also log to file
console.log = (message, ...args) => {
  if (typeof message === 'object') {
    try {
      const stringified = JSON.stringify(message);
      writeToLog('log', stringified);
    } catch (e) {
      writeToLog('log', '[Object that cannot be stringified]');
    }
  } else {
    writeToLog('log', message);
  }
  originalConsole.log(message, ...args);
};

console.error = (message, ...args) => {
  if (typeof message === 'object' && !(message instanceof Error)) {
    try {
      const stringified = JSON.stringify(message);
      writeToLog('error', stringified, args[0]);
    } catch (e) {
      writeToLog('error', '[Object that cannot be stringified]', args[0]);
    }
  } else {
    writeToLog('error', message, args[0]);
  }
  originalConsole.error(message, ...args);
};

console.warn = (message, ...args) => {
  if (typeof message === 'object') {
    try {
      const stringified = JSON.stringify(message);
      writeToLog('warn', stringified);
    } catch (e) {
      writeToLog('warn', '[Object that cannot be stringified]');
    }
  } else {
    writeToLog('warn', message);
  }
  originalConsole.warn(message, ...args);
};

console.info = (message, ...args) => {
  if (typeof message === 'object') {
    try {
      const stringified = JSON.stringify(message);
      writeToLog('info', stringified);
    } catch (e) {
      writeToLog('info', '[Object that cannot be stringified]');
    }
  } else {
    writeToLog('info', message);
  }
  originalConsole.info(message, ...args);
};

let mainWindow;
let isDbInitialized = false;

// Log app start using writeToLog directly to avoid possible issues
writeToLog('info', `Application started - Version: ${app.getVersion()}`);
writeToLog('info', `User data path: ${userDataPath}`);
writeToLog('info', `Log file: ${logFile}`);

function createWindow() {
  // Create the browser window with senior-friendly dimensions
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html from React dev server or the built file
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  writeToLog('info', `Loading app from: ${startUrl}`);
  
  mainWindow.loadURL(startUrl);

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
    writeToLog('info', 'DevTools opened (development mode)');
  }

  // Auto-lock after inactivity (5 minutes)
  let inactivityTimer;
  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      // Send lock signal to renderer
      if (mainWindow) {
        mainWindow.webContents.send('lock-application');
        database.close();
        isDbInitialized = false;
        writeToLog('info', 'Application auto-locked due to inactivity');
      }
    }, 1 * 60 * 1000); // 1 minutes
  };

  // Reset timer on any user activity
  mainWindow.on('focus', resetInactivityTimer);
  resetInactivityTimer();

  mainWindow.on('closed', () => {
    writeToLog('info', 'Main window closed');
    mainWindow = null;
    database.close();
  });
}

// Wait for app to be ready before creating window
app.whenReady().then(() => {
  writeToLog('info', 'Electron app is ready');
  writeToLog('info', `App path: ${app.getAppPath()}`);
  
  // Ensure user data directories exist
  ensureUserDirectories();
  
  createWindow();
}).catch(error => {
  writeToLog('error', 'Failed to initialize app', error);
});

// Make sure all user data directories exist
function ensureUserDirectories() {
  // Create directories if they don't exist
  const directories = [
    path.join(userDataPath, 'database'),
    path.join(userDataPath, 'backups')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        writeToLog('info', `Created directory: ${dir}`);
      } catch (error) {
        writeToLog('error', `Failed to create directory ${dir}`, error);
      }
    }
  });
}

// Handle app before update/uninstall
app.on('will-quit', () => {
  // Ensure database is closed properly
  database.close();
  writeToLog('info', 'Application will quit, database closed');
});

app.on('window-all-closed', () => {
  writeToLog('info', 'All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  writeToLog('info', 'App activated');
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for database operations
ipcMain.handle('initialize-db', async (event, password) => {
  try {
    writeToLog('info', 'Initializing database with password...');
    if (!password || typeof password !== 'string' || password.length < 1) {
      const error = 'Invalid password provided';
      writeToLog('error', error);
      return { success: false, error };
    }
    
    const result = await database.initialize(password);
    isDbInitialized = true;
    writeToLog('info', 'Database initialization successful');
    return { success: true };
  } catch (error) {
    writeToLog('error', 'Failed to initialize database', error);
    // Return a more detailed error message to help debugging
    return { 
      success: false, 
      error: error.message,
      details: error.stack
    };
  }
});

// Get the logs
ipcMain.handle('get-logs', async () => {
  try {
    const logFiles = fs.readdirSync(logDir)
      .filter(file => file.endsWith('.log'))
      .sort()
      .reverse();
    
    if (logFiles.length === 0) {
      return { success: true, logs: 'No log files found' };
    }
    
    // Return the content of the most recent log file
    const latestLogFile = path.join(logDir, logFiles[0]);
    const logs = fs.readFileSync(latestLogFile, 'utf8');
    
    return { 
      success: true, 
      logs,
      logPath: latestLogFile
    };
  } catch (error) {
    writeToLog('error', 'Failed to get logs', error);
    return { success: false, error: error.message };
  }
});

// Show the folder that contains the database
ipcMain.handle('show-database-folder', async () => {
  try {
    const dbDir = path.join(userDataPath, 'database');
    // Open the folder in the file explorer
    const opened = await dialog.showOpenDialog({
      defaultPath: dbDir,
      properties: ['openDirectory']
    });
    return { success: true, result: opened };
  } catch (error) {
    writeToLog('error', 'Failed to show database folder', error);
    return { success: false, error: error.message };
  }
});

// IPC handler for verifying the master password
ipcMain.handle('verify-password', async (event, password) => {
  try {
    if (!isDbInitialized) {
      console.error('Cannot verify password: Database not initialized');
      return { success: false, error: 'Database not initialized' };
    }
    
    console.log('Verifying master password...');
    const isValid = await database.verifyMasterPassword(password);
    console.log('Password verification result:', isValid);
    return { success: isValid };
  } catch (error) {
    console.error('Failed to verify password:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-accounts', async () => {
  try {
    if (!isDbInitialized) {
      console.error('Cannot get accounts: Database not initialized');
      return { success: false, error: 'Database not initialized' };
    }
    
    console.log('Getting all accounts...');
    const accounts = await database.getAccounts();
    return { success: true, accounts };
  } catch (error) {
    console.error('Failed to get accounts:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-account', async (event, accountData) => {
  try {
    if (!isDbInitialized) {
      console.error('Cannot add account: Database not initialized');
      return { success: false, error: 'Database not initialized' };
    }
    
    console.log('Adding new account...');
    const account = await database.addAccount(accountData);
    return { success: true, account };
  } catch (error) {
    console.error('Failed to add account:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-account', async (event, accountData) => {
  try {
    if (!isDbInitialized) {
      console.error('Cannot update account: Database not initialized');
      return { success: false, error: 'Database not initialized' };
    }
    
    console.log('Updating account...');
    const account = await database.updateAccount(accountData);
    return { success: true, account };
  } catch (error) {
    console.error('Failed to update account:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-account', async (event, id) => {
  try {
    if (!isDbInitialized) {
      console.error('Cannot delete account: Database not initialized');
      return { success: false, error: 'Database not initialized' };
    }
    
    console.log('Deleting account...');
    await database.deleteAccount(id);
    return { success: true, id };
  } catch (error) {
    console.error('Failed to delete account:', error);
    return { success: false, error: error.message };
  }
});

// New IPC handlers for database management
ipcMain.handle('create-backup', async () => {
  try {
    if (!isDbInitialized) {
      throw new Error('Database not initialized');
    }
    
    database.createBackup();
    return { success: true };
  } catch (error) {
    console.error('Failed to create backup:', error);
    return { success: false, error: error.message };
  }
});

// New IPC handler to get database path
ipcMain.handle('get-database-path', async () => {
  try {
    return { 
      success: true, 
      path: database.dbPath
    };
  } catch (error) {
    console.error('Failed to get database path:', error);
    return { success: false, error: error.message };
  }
});

// Add new IPC handler for changing master password
ipcMain.handle('change-master-password', async (event, { currentPassword, newPassword }) => {
  try {
    if (!isDbInitialized) {
      console.error('Cannot change password: Database not initialized');
      return { success: false, error: 'Database not initialized' };
    }
    
    console.log('Changing master password...');
    await database.changeMasterPassword(currentPassword, newPassword);
    console.log('Master password changed successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to change master password:', error);
    return { success: false, error: error.message };
  }
});

// Add new IPC handlers for security questions and database existence
ipcMain.handle('database-exists', async () => {
  try {
    // Check if the database file exists
    const dbPath = database.dbPath;
    const exists = fs.existsSync(dbPath);
    
    writeToLog('info', `Database existence check: ${exists ? 'exists' : 'does not exist'} at ${dbPath}`);
    return { success: true, exists };
  } catch (error) {
    writeToLog('error', 'Failed to check database existence', error);
    return { success: false, error: error.message, exists: false };
  }
});

ipcMain.handle('setup-database', async (event, { password, securityQuestions }) => {
  try {
    writeToLog('info', 'Setting up new database with password and security questions');
    
    if (!password || typeof password !== 'string' || password.length < 1) {
      const error = 'Invalid password provided';
      writeToLog('error', error);
      return { success: false, error };
    }
    
    if (!securityQuestions || !Array.isArray(securityQuestions) || securityQuestions.length === 0) {
      const error = 'Invalid security questions provided';
      writeToLog('error', error);
      return { success: false, error };
    }
    
    const result = await database.setup(password, securityQuestions);
    isDbInitialized = true;
    writeToLog('info', 'Database setup successful');
    return { success: true };
  } catch (error) {
    writeToLog('error', 'Failed to set up database', error);
    return { 
      success: false, 
      error: error.message,
      details: error.stack
    };
  }
});

ipcMain.handle('get-security-questions', async () => {
  try {
    if (!isDbInitialized) {
      console.error('Cannot get security questions: Database not initialized');
      return { success: false, error: 'Database not initialized' };
    }
    
    console.log('Getting security questions...');
    const questionIds = await database.getSecurityQuestionIds();
    return { success: true, questionIds };
  } catch (error) {
    console.error('Failed to get security questions:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('verify-security-answers', async (event, questionAnswers) => {
  try {
    if (!isDbInitialized) {
      console.error('Cannot verify security answers: Database not initialized');
      return { success: false, error: 'Database not initialized' };
    }
    
    console.log('Verifying security question answers...');
    const isValid = await database.verifySecurityAnswers(questionAnswers);
    return { success: isValid };
  } catch (error) {
    console.error('Failed to verify security answers:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-password', async (event, { newPassword, questionAnswers }) => {
  try {
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 1) {
      console.error('Invalid new password provided');
      return { success: false, error: 'Invalid new password provided' };
    }
    
    if (!questionAnswers || !Array.isArray(questionAnswers) || questionAnswers.length === 0) {
      console.error('Invalid security answers provided');
      return { success: false, error: 'Invalid security answers provided' };
    }
    
    console.log('Resetting password with security answers...');
    const result = await database.resetPasswordWithSecurityAnswers(newPassword, questionAnswers);
    
    if (result) {
      // Successfully reset password
      console.log('Password reset successful');
      return { success: true };
    } else {
      console.error('Failed to reset password: Security answers may be incorrect');
      return { success: false, error: 'Failed to reset password' };
    }
  } catch (error) {
    console.error('Failed to reset password:', error);
    return { success: false, error: error.message };
  }
});
