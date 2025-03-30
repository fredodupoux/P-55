const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    receive: (channel, func) => {
      const validChannels = ['lock-application', 'db-response'];
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
        'get-last-error'
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    }
  }
);
