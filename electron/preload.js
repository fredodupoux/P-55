const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    receive: (channel, func) => {
      const validChannels = ['lock-application', 'db-response', 'update-available', 'update-ready'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    send: (channel, data) => {
      const validChannels = [
        'initialize-db', 
        'get-accounts', 
        'add-account', 
        'update-account', 
        'delete-account',
        'verify-password',
        'create-backup',
        'get-database-path',
        'change-master-password',
        'get-logs',
        'show-database-folder',
        'database-exists',
        'setup-database',
        'get-security-questions',
        'verify-security-answers',
        'reset-password'
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    invoke: (channel, data) => {
      const validChannels = [
        'initialize-db', 
        'get-accounts', 
        'add-account', 
        'update-account', 
        'delete-account',
        'verify-password',
        'create-backup',
        'get-database-path',
        'change-master-password',
        'get-logs',
        'show-database-folder',
        'database-exists',
        'setup-database',
        'get-security-questions',
        'verify-security-answers',
        'reset-password',
        'get-last-error',
        // Add new TOTP channels
        'authenticate',
        'get-totp-settings',
        'enable-totp',
        'disable-totp',
        'verify-totp'
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    }
  }
);

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication functions
  initializeDatabase: (password) => ipcRenderer.invoke('initialize-db', password),
  authenticate: (credential) => ipcRenderer.invoke('authenticate', credential),
  verifyPassword: (password) => ipcRenderer.invoke('verify-password', password),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  showDatabaseFolder: () => ipcRenderer.invoke('show-database-folder'),
  getDatabasePath: () => ipcRenderer.invoke('get-database-path'),
  getLastError: () => ipcRenderer.invoke('get-last-error'),
  
  // Account management functions
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (account) => ipcRenderer.invoke('add-account', account),
  updateAccount: (account) => ipcRenderer.invoke('update-account', account),
  deleteAccount: (id) => ipcRenderer.invoke('delete-account', id),
  
  // Database management functions
  databaseExists: () => ipcRenderer.invoke('database-exists'),
  setupDatabase: (data) => ipcRenderer.invoke('setup-database', data),
  createBackup: () => ipcRenderer.invoke('create-backup'),
  changeMasterPassword: (data) => ipcRenderer.invoke('change-master-password', data),
  
  // Security question functions
  getSecurityQuestions: () => ipcRenderer.invoke('get-security-questions'),
  verifySecurityAnswers: (answers) => ipcRenderer.invoke('verify-security-answers', answers),
  resetPassword: (data) => ipcRenderer.invoke('reset-password', data),
  
  // TOTP functions
  getTOTPSettings: () => ipcRenderer.invoke('get-totp-settings'),
  enableTOTP: () => ipcRenderer.invoke('enable-totp'),
  disableTOTP: () => ipcRenderer.invoke('disable-totp'),
  verifyTOTP: (token) => ipcRenderer.invoke('verify-totp', token),
  
  // Zoom functions
  zoomIn: () => ipcRenderer.invoke('zoom-in'),
  zoomOut: () => ipcRenderer.invoke('zoom-out'),
  getZoomLevel: () => ipcRenderer.invoke('get-zoom-level'),
  
  // Event listeners
  onLockApplication: (callback) => {
    ipcRenderer.on('lock-application', callback);
    return () => ipcRenderer.removeListener('lock-application', callback);
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', callback);
    return () => ipcRenderer.removeListener('update-available', callback);
  },
  onUpdateReady: (callback) => {
    ipcRenderer.on('update-ready', callback);
    return () => ipcRenderer.removeListener('update-ready', callback);
  }
});
