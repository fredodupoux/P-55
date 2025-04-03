export interface ElectronAPI {
  send: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  invoke: (channel: string, data: any) => Promise<any>;
}

export interface BackupResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface BrowserImportResult {
  success: boolean;
  imported: number;
  duplicates?: number;
  updated?: number;
  errors?: number;
  error?: string;
}

export interface AvailableBrowsersResult {
  success: boolean;
  browsers: {
    chrome: boolean;
    firefox: boolean;
    safari: boolean;
    edge: boolean;
    brave: boolean;
    opera: boolean;
  };
  error?: string;
}

export interface ElectronDirectAPI {
  // Authentication functions
  initializeDatabase: (password: string) => Promise<any>;
  authenticate: (credential: string) => Promise<any>;
  verifyPassword: (password: string) => Promise<any>;
  getLogs: () => Promise<any>;
  showDatabaseFolder: () => Promise<any>;
  getDatabasePath: () => Promise<any>;
  getLastError: () => Promise<any>;
  
  // Account management functions
  getAccounts: () => Promise<any>;
  addAccount: (account: any) => Promise<any>;
  updateAccount: (account: any) => Promise<any>;
  deleteAccount: (id: number) => Promise<any>;
  
  // Database management functions
  databaseExists: () => Promise<any>;
  setupDatabase: (data: any) => Promise<any>;
  createBackup: () => Promise<any>;
  changeMasterPassword: (data: any) => Promise<any>;
  
  // Security question functions
  getSecurityQuestions: () => Promise<any>;
  verifySecurityAnswers: (answers: any[]) => Promise<any>;
  resetPassword: (data: any) => Promise<any>;
  
  // TOTP functions
  getTOTPSettings: () => Promise<any>;
  enableTOTP: () => Promise<any>;
  disableTOTP: () => Promise<any>;
  verifyTOTP: (token: string) => Promise<any>;
  
  // Zoom functions
  zoomIn: () => Promise<any>;
  zoomOut: () => Promise<any>;
  getZoomLevel: () => Promise<any>;
  
  // Custom backup and restore functions
  createBackupCustomLocation: () => Promise<BackupResult>;
  restoreDatabaseBackup: () => Promise<BackupResult>;
  
  // Browser password import functions
  getAvailableBrowsers: () => Promise<AvailableBrowsersResult>;
  importFromBrowser: (options: { browserType: string }) => Promise<BrowserImportResult>;
  
  // Application functions
  restartApplication: () => Promise<{success: boolean, error?: string}>;
  
  // User activity tracking functions
  reportUserActivity: () => void;
  
  // Event listeners
  onLockApplication: (callback: () => void) => (() => void);
  onUpdateAvailable: (callback: () => void) => (() => void);
  onUpdateReady: (callback: () => void) => (() => void);
  onStartActivityMonitoring: (callback: () => void) => (() => void);
}

// Extend the global Window interface
declare global {
  interface Window {
    api?: ElectronAPI;
    electronAPI?: ElectronDirectAPI;
  }
}
