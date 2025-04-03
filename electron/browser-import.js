const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const sqlite3 = require('sqlite3');
// Removed the sqlite import as we'll use sqlite3 directly

/**
 * Detect browsers installed on the user's system
 * @returns {Promise<Object>} Object containing detected browsers and their paths
 */
async function detectBrowsers() {
  const browsers = {
    chrome: null,
    firefox: null,
    edge: null,
    safari: null,
    brave: null,
    opera: null
  };

  // Get platform-specific paths
  const platform = process.platform;
  let chromePath, firefoxPath, edgePath, safariPath, bravePath, operaPath;

  try {
    if (platform === 'darwin') {
      // macOS paths
      chromePath = '/Applications/Google Chrome.app';
      firefoxPath = '/Applications/Firefox.app';
      edgePath = '/Applications/Microsoft Edge.app';
      safariPath = '/Applications/Safari.app';
      bravePath = '/Applications/Brave Browser.app';
      operaPath = '/Applications/Opera.app';

      if (fs.existsSync(chromePath)) browsers.chrome = { path: chromePath };
      if (fs.existsSync(firefoxPath)) browsers.firefox = { path: firefoxPath };
      if (fs.existsSync(edgePath)) browsers.edge = { path: edgePath };
      if (fs.existsSync(safariPath)) browsers.safari = { path: safariPath };
      if (fs.existsSync(bravePath)) browsers.brave = { path: bravePath };
      if (fs.existsSync(operaPath)) browsers.opera = { path: operaPath };
      
      // Get profile paths for browsers when possible
      if (browsers.chrome) {
        browsers.chrome.profiles = await getChromeProfiles('darwin');
      }
      if (browsers.firefox) {
        browsers.firefox.profiles = await getFirefoxProfiles('darwin');
      }
    } else if (platform === 'win32') {
      // Windows paths
      const programFiles = process.env['ProgramFiles'];
      const programFilesX86 = process.env['ProgramFiles(x86)'];
      const localAppData = process.env['LOCALAPPDATA'];

      chromePath = path.join(programFiles || '', 'Google/Chrome/Application/chrome.exe');
      const chromePathX86 = path.join(programFilesX86 || '', 'Google/Chrome/Application/chrome.exe');
      firefoxPath = path.join(programFiles || '', 'Mozilla Firefox/firefox.exe');
      const firefoxPathX86 = path.join(programFilesX86 || '', 'Mozilla Firefox/firefox.exe');
      edgePath = path.join(programFiles || '', 'Microsoft\\Edge\\Application\\msedge.exe');
      const edgePathX86 = path.join(programFilesX86 || '', 'Microsoft\\Edge\\Application\\msedge.exe');
      bravePath = path.join(localAppData || '', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe');
      operaPath = path.join(programFiles || '', 'Opera/launcher.exe');
      const operaPathX86 = path.join(programFilesX86 || '', 'Opera/launcher.exe');

      if (fs.existsSync(chromePath)) browsers.chrome = { path: chromePath };
      else if (fs.existsSync(chromePathX86)) browsers.chrome = { path: chromePathX86 };
      
      if (fs.existsSync(firefoxPath)) browsers.firefox = { path: firefoxPath };
      else if (fs.existsSync(firefoxPathX86)) browsers.firefox = { path: firefoxPathX86 };
      
      if (fs.existsSync(edgePath)) browsers.edge = { path: edgePath };
      else if (fs.existsSync(edgePathX86)) browsers.edge = { path: edgePathX86 };
      
      if (fs.existsSync(bravePath)) browsers.brave = { path: bravePath };
      
      if (fs.existsSync(operaPath)) browsers.opera = { path: operaPath };
      else if (fs.existsSync(operaPathX86)) browsers.opera = { path: operaPathX86 };
      
      // Get profile paths
      if (browsers.chrome) {
        browsers.chrome.profiles = await getChromeProfiles('win32');
      }
      if (browsers.firefox) {
        browsers.firefox.profiles = await getFirefoxProfiles('win32');
      }
    } else if (platform === 'linux') {
      // Linux detection - check if browsers are in PATH
      try {
        execSync('google-chrome --version', { stdio: 'ignore' });
        browsers.chrome = { path: 'google-chrome' };
      } catch (e) {
        try {
          execSync('google-chrome-stable --version', { stdio: 'ignore' });
          browsers.chrome = { path: 'google-chrome-stable' };
        } catch (e2) {
          // Chrome not found
        }
      }
      
      try {
        execSync('firefox --version', { stdio: 'ignore' });
        browsers.firefox = { path: 'firefox' };
      } catch (e) {
        // Firefox not found
      }
      
      try {
        execSync('microsoft-edge --version', { stdio: 'ignore' });
        browsers.edge = { path: 'microsoft-edge' };
      } catch (e) {
        // Edge not found
      }
      
      try {
        execSync('brave-browser --version', { stdio: 'ignore' });
        browsers.brave = { path: 'brave-browser' };
      } catch (e) {
        // Brave not found
      }
      
      try {
        execSync('opera --version', { stdio: 'ignore' });
        browsers.opera = { path: 'opera' };
      } catch (e) {
        // Opera not found
      }
      
      // Get profile paths
      if (browsers.chrome) {
        browsers.chrome.profiles = await getChromeProfiles('linux');
      }
      if (browsers.firefox) {
        browsers.firefox.profiles = await getFirefoxProfiles('linux');
      }
    }
  } catch (error) {
    console.error('Error detecting browsers:', error);
  }

  return browsers;
}

/**
 * Get Chrome profile directories
 * @param {string} platform Operating system
 * @returns {Promise<Array>} List of profile paths
 */
async function getChromeProfiles(platform) {
  try {
    let profilesPath;
    
    if (platform === 'darwin') {
      profilesPath = path.join(os.homedir(), 'Library/Application Support/Google/Chrome');
    } else if (platform === 'win32') {
      profilesPath = path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data');
    } else if (platform === 'linux') {
      profilesPath = path.join(os.homedir(), '.config/google-chrome');
    }
    
    if (!fs.existsSync(profilesPath)) {
      return [];
    }
    
    const profiles = [];
    const items = fs.readdirSync(profilesPath);
    
    for (const item of items) {
      if (item.includes('Profile') || item === 'Default') {
        const profileDir = path.join(profilesPath, item);
        if (fs.statSync(profileDir).isDirectory()) {
          profiles.push({
            name: item,
            path: profileDir
          });
        }
      }
    }
    
    return profiles;
  } catch (error) {
    console.error('Error getting Chrome profiles:', error);
    return [];
  }
}

/**
 * Get Firefox profile directories
 * @param {string} platform Operating system
 * @returns {Promise<Array>} List of profile paths
 */
async function getFirefoxProfiles(platform) {
  try {
    let profilesPath;
    
    if (platform === 'darwin') {
      profilesPath = path.join(os.homedir(), 'Library/Application Support/Firefox/Profiles');
    } else if (platform === 'win32') {
      profilesPath = path.join(process.env.APPDATA || '', 'Mozilla/Firefox/Profiles');
    } else if (platform === 'linux') {
      profilesPath = path.join(os.homedir(), '.mozilla/firefox');
    }
    
    if (!fs.existsSync(profilesPath)) {
      return [];
    }
    
    const profiles = [];
    const items = fs.readdirSync(profilesPath);
    
    for (const item of items) {
      const profileDir = path.join(profilesPath, item);
      if (fs.statSync(profileDir).isDirectory()) {
        profiles.push({
          name: item,
          path: profileDir
        });
      }
    }
    
    return profiles;
  } catch (error) {
    console.error('Error getting Firefox profiles:', error);
    return [];
  }
}

/**
 * Import passwords from various browsers
 * @param {string} browserType The type of browser to import from
 * @param {object} database The database instance
 * @param {object} dialog Electron dialog module
 * @param {object} window The main window instance
 * @param {object} options Import options
 * @returns {Promise<Object>} Import result
 */
async function importFromBrowser(browserType, database, dialog, window, options = { handleDuplicates: 'skip', createCategory: true }) {
  try {
    let importedCount = 0;
    let result;
    
    // Different import logic based on browser type
    switch (browserType) {
      case 'chrome':
        result = await importFromChrome(database, dialog, window, options);
        break;
      case 'firefox':
        result = await importFromFirefox(database, dialog, window, options);
        break;
      case 'edge':
        result = await importFromEdge(database, dialog, window, options);
        break;
      case 'brave':
        result = await importFromBrave(database, dialog, window, options);
        break;
      case 'safari':
        result = await importFromSafari(database, dialog, window, options);
        break;
      case 'opera':
        result = await importFromOpera(database, dialog, window, options);
        break;
      default:
        return { success: false, imported: 0, error: `Unsupported browser type: ${browserType}` };
    }
    
    if (result && result.success) {
      importedCount = result.imported;
      // Include all result fields in the return value
      return { 
        success: true, 
        ...result
      };
    } else {
      throw new Error(result?.error || `Failed to import from ${browserType}`);
    }
  } catch (error) {
    console.error(`Error importing from ${browserType}:`, error);
    return { 
      success: false, 
      imported: 0, 
      error: error.message || `Failed to import from ${browserType}`
    };
  }
}

/**
 * Import passwords from Chrome
 * @param {object} database The database instance
 * @param {object} dialog Electron dialog module
 * @param {object} window The main window instance
 * @param {object} options Import options
 * @returns {Promise<Object>} Import result
 */
async function importFromChrome(database, dialog, window, options = { handleDuplicates: 'skip', createCategory: true }) {
  try {
    // Chrome stores passwords in a SQLite database with encryption
    // For simplicity, we'll ask the user to export from Chrome and import the CSV
    const result = await dialog.showOpenDialog(window, {
      title: 'Import Chrome Passwords',
      message: 'Please select the CSV file exported from Chrome.\n' +
               'You can export passwords in Chrome by going to:\n' +
               'Settings > Passwords > ••• > Export Passwords',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (result.canceled || !result.filePaths.length) {
      return { success: false, imported: 0, error: 'Import was canceled' };
    }
    
    return importFromCSV(result.filePaths[0], database, options);
  } catch (error) {
    console.error('Error importing from Chrome:', error);
    return { success: false, imported: 0, error: error.message };
  }
}

/**
 * Import passwords from Firefox
 * @param {object} database The database instance
 * @param {object} dialog Electron dialog module
 * @param {object} window The main window instance
 * @param {object} options Import options
 * @returns {Promise<Object>} Import result
 */
async function importFromFirefox(database, dialog, window, options = { handleDuplicates: 'skip', createCategory: true }) {
  try {
    // Firefox also requires export first
    const result = await dialog.showOpenDialog(window, {
      title: 'Import Firefox Passwords',
      message: 'Please select the CSV file exported from Firefox.\n' +
               'You can export passwords in Firefox by going to:\n' +
               'Menu > Logins and Passwords > ••• > Export Logins',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (result.canceled || !result.filePaths.length) {
      return { success: false, imported: 0, error: 'Import was canceled' };
    }
    
    return importFromCSV(result.filePaths[0], database, options);
  } catch (error) {
    console.error('Error importing from Firefox:', error);
    return { success: false, imported: 0, error: error.message };
  }
}

/**
 * Import passwords from Edge
 * @param {object} database The database instance
 * @param {object} dialog Electron dialog module
 * @param {object} window The main window instance
 * @param {object} options Import options
 * @returns {Promise<Object>} Import result
 */
async function importFromEdge(database, dialog, window, options = { handleDuplicates: 'skip', createCategory: true }) {
  try {
    // Edge also uses Chromium's password system
    const result = await dialog.showOpenDialog(window, {
      title: 'Import Edge Passwords',
      message: 'Please select the CSV file exported from Edge.\n' +
               'You can export passwords in Edge by going to:\n' +
               'Settings > Passwords > ••• > Export Passwords',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (result.canceled || !result.filePaths.length) {
      return { success: false, imported: 0, error: 'Import was canceled' };
    }
    
    return importFromCSV(result.filePaths[0], database, options);
  } catch (error) {
    console.error('Error importing from Edge:', error);
    return { success: false, imported: 0, error: error.message };
  }
}

/**
 * Import passwords from Brave
 * @param {object} database The database instance
 * @param {object} dialog Electron dialog module
 * @param {object} window The main window instance
 * @param {object} options Import options
 * @returns {Promise<Object>} Import result
 */
async function importFromBrave(database, dialog, window, options = { handleDuplicates: 'skip', createCategory: true }) {
  try {
    // Brave also uses Chromium's password system
    const result = await dialog.showOpenDialog(window, {
      title: 'Import Brave Passwords',
      message: 'Please select the CSV file exported from Brave.\n' +
               'You can export passwords in Brave by going to:\n' +
               'Settings > Passwords > ••• > Export Passwords',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (result.canceled || !result.filePaths.length) {
      return { success: false, imported: 0, error: 'Import was canceled' };
    }
    
    return importFromCSV(result.filePaths[0], database, options);
  } catch (error) {
    console.error('Error importing from Brave:', error);
    return { success: false, imported: 0, error: error.message };
  }
}

/**
 * Import passwords from Safari
 * @param {object} database The database instance
 * @param {object} dialog Electron dialog module
 * @param {object} window The main window instance
 * @param {object} options Import options
 * @returns {Promise<Object>} Import result
 */
async function importFromSafari(database, dialog, window, options = { handleDuplicates: 'skip', createCategory: true }) {
  // For Safari, direct export isn't available, guide user to use Keychain Access
  await dialog.showMessageBox(window, {
    type: 'info',
    title: 'Safari Password Export',
    message: 'Safari doesn\'t provide direct password export.',
    detail: 'To export passwords from Safari:\n\n' +
            '1. Open Keychain Access\n' +
            '2. Search for website passwords\n' +
            '3. Export selected items to a CSV file\n\n' +
            'After exporting, select the CSV file in the next dialog.'
  });
  
  const result = await dialog.showOpenDialog(window, {
    title: 'Import Safari Passwords',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  
  if (result.canceled || !result.filePaths.length) {
    return { success: false, imported: 0, error: 'Import was canceled' };
  }
  
  return importFromCSV(result.filePaths[0], database, options);
}

/**
 * Import passwords from Opera
 * @param {object} database The database instance
 * @param {object} dialog Electron dialog module
 * @param {object} window The main window instance
 * @param {object} options Import options
 * @returns {Promise<Object>} Import result
 */
async function importFromOpera(database, dialog, window, options = { handleDuplicates: 'skip', createCategory: true }) {
  try {
    // Opera uses Chromium's password system
    const result = await dialog.showOpenDialog(window, {
      title: 'Import Opera Passwords',
      message: 'Please select the CSV file exported from Opera.\n' +
               'You can export passwords in Opera by going to:\n' +
               'Settings > Privacy & Security > Passwords > ••• > Export Passwords',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (result.canceled || !result.filePaths.length) {
      return { success: false, imported: 0, error: 'Import was canceled' };
    }
    
    return importFromCSV(result.filePaths[0], database, options);
  } catch (error) {
    console.error('Error importing from Opera:', error);
    return { success: false, imported: 0, error: error.message };
  }
}

/**
 * Import passwords from a CSV file
 * @param {string} filePath Path to the CSV file
 * @param {object} database Database instance
 * @param {object} options Import options
 * @returns {Promise<Object>} Import result
 */
async function importFromCSV(filePath, database, options = { handleDuplicates: 'skip', createCategory: true }) {
  const fs = require('fs');
  const csv = require('csv-parser');
  const path = require('path');
  const { URL } = require('url');
  
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }
    
    // Determine the browser type from file content (header analysis)
    let accountsArray = [];
    let browserType = '';
    let duplicatesFound = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    
    // Parse the CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Try to determine browser type from headers if not already determined
          if (!browserType) {
            if (row.name && row.url && row.username && row.password) {
              browserType = 'chrome'; // Chrome, Edge, Brave
            } else if (row.hostname && row.username && row.password) {
              browserType = 'firefox';
            } else if (row['Web Address'] && row['User Name'] && row.Password) {
              browserType = 'safari';
            } else if (row['Site'] && row['Username'] && row['Password']) {
              browserType = 'opera';
            }
          }
          
          // Basic validation - skip empty rows or missing required fields
          if (Object.keys(row).length === 0) return;
          
          // Convert row to standardized account format based on browser format
          const account = convertRowToAccount(row, browserType);
          
          // Skip invalid accounts
          if (!account) return;
          
          // Add to array
          accountsArray.push(account);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    if (!accountsArray.length) {
      throw new Error('No valid accounts found in the CSV file');
    }
    
    console.log(`Found ${accountsArray.length} accounts to import from ${browserType} format`);
    
    // Create browser category if needed and requested
    let categoryId = null;
    if (options.createCategory) {
      try {
        // Check if the category already exists
        const categories = await database.getCategories();
        const browserCategory = categories.find(c => c.name === browserType);
        
        if (browserCategory) {
          categoryId = browserCategory.id;
        } else {
          // Create new category
          const newCategory = await database.addCategory({
            name: browserType,
            color: getColorForBrowser(browserType),
            description: `Imported from ${browserType}`
          });
          categoryId = newCategory.id;
        }
      } catch (error) {
        console.error('Failed to create/get browser category:', error);
        // Continue without category if there's an error
      }
    }
    
    // Get existing accounts to check for duplicates
    const existingAccounts = await database.getAccounts();
    
    // Process accounts in batches to improve performance
    const BATCH_SIZE = 10;
    let imported = 0;
    
    // Process in batches
    for (let i = 0; i < accountsArray.length; i += BATCH_SIZE) {
      const batch = accountsArray.slice(i, i + BATCH_SIZE);
      
      // Process each account in the batch
      for (const account of batch) {
        try {
          // If a category was created, assign it to the account
          if (categoryId) {
            account.categoryId = categoryId;
          }
          
          // Check for duplicates by URL and username
          const isDuplicate = checkForDuplicate(account, existingAccounts);
          
          if (isDuplicate) {
            duplicatesFound++;
            
            if (options.handleDuplicates === 'skip') {
              // Skip this account
              skippedCount++;
              continue;
            } else if (options.handleDuplicates === 'update') {
              // Update the existing account
              const existingAccount = existingAccounts.find(a => 
                a.url === account.url && a.username === account.username
              );
              
              if (existingAccount) {
                // Preserve fields that should not be overwritten
                account.id = existingAccount.id;
                account.createdAt = existingAccount.createdAt;
                account.notes = account.notes || existingAccount.notes;
                
                // Update the account
                await database.updateAccount(account);
                updatedCount++;
                imported++;
              }
            }
          } else {
            // Not a duplicate, add as new
            await database.addAccount(account);
            imported++;
          }
        } catch (error) {
          console.error(`Error importing account ${account.name}:`, error);
          // Continue with next account
        }
      }
    }
    
    return {
      success: true,
      imported,
      skipped: skippedCount,
      updated: updatedCount,
      duplicates: duplicatesFound,
      total: accountsArray.length,
      browserType
    };
  } catch (error) {
    console.error('CSV import error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Convert a row from CSV to standardized account format
 * @param {object} row CSV row data
 * @param {string} browserType Browser type
 * @returns {object|null} Formatted account or null if invalid
 */
function convertRowToAccount(row, browserType) {
  // Get current date for account creation time
  const now = new Date().toISOString();
  
  try {
    let account = {
      name: '',
      url: '',
      username: '',
      password: '',
      notes: `Imported from ${browserType} on ${new Date().toLocaleDateString()}`,
      createdAt: now,
      updatedAt: now,
      lastUsed: now,
      strength: 0
    };
    
    // Map fields based on browser format
    switch (browserType) {
      case 'chrome':
      case 'brave':
      case 'edge':
        account.name = row.name || extractDomainForName(row.url) || 'Unknown';
        account.url = sanitizeUrl(row.url);
        account.username = row.username || '';
        account.password = row.password || '';
        break;
        
      case 'firefox':
        account.name = row.hostname || extractDomainForName(row.url) || 'Unknown';
        account.url = sanitizeUrl(row.url || row.hostname);
        account.username = row.username || '';
        account.password = row.password || '';
        break;
        
      case 'safari':
        account.name = row.Title || extractDomainForName(row['Web Address']) || 'Unknown';
        account.url = sanitizeUrl(row['Web Address']);
        account.username = row['User Name'] || '';
        account.password = row.Password || '';
        break;
        
      case 'opera':
        account.name = row.Site || extractDomainForName(row.URL) || 'Unknown';
        account.url = sanitizeUrl(row.URL || row.Site);
        account.username = row.Username || '';
        account.password = row.Password || '';
        break;
        
      default:
        // Handle unknown format - try common field names
        account.name = row.name || row.title || row.site || row.hostname || 'Unknown';
        account.url = sanitizeUrl(row.url || row.web_address || row.URL || row.hostname || '');
        account.username = row.username || row.user || row.login || row['User Name'] || row.Username || '';
        account.password = row.password || row.pass || row.Password || '';
    }
    
    // Validate that we have the minimum required fields
    if (!account.password) {
      console.log('Skipping account with no password:', account.name);
      return null;
    }
    
    // Set name from URL if it's missing
    if (!account.name || account.name === 'Unknown') {
      account.name = extractDomainForName(account.url) || 'Unknown Site';
    }
    
    return account;
  } catch (error) {
    console.error('Error converting CSV row:', error);
    return null;
  }
}

/**
 * Sanitize and validate URLs
 * @param {string} url URL string to sanitize
 * @returns {string} Sanitized URL
 */
function sanitizeUrl(url) {
  if (!url) return '';
  
  try {
    // Check if URL is already properly formatted with protocol
    if (!url.match(/^https?:\/\//i)) {
      // Add https:// prefix if no protocol specified
      url = 'https://' + url;
    }
    
    // Try to parse the URL to validate it
    const parsedUrl = new URL(url);
    return parsedUrl.href;
  } catch (error) {
    // If URL is invalid, return the original input
    return url;
  }
}

/**
 * Extract domain name for account name
 * @param {string} url Website URL
 * @returns {string} Domain name or empty string
 */
function extractDomainForName(url) {
  if (!url) return '';
  
  try {
    // Add protocol if missing for URL parsing
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }
    
    const parsedUrl = new URL(url);
    // Get domain without www. prefix
    return parsedUrl.hostname.replace(/^www\./i, '');
  } catch (error) {
    // Return original if parsing fails
    return url;
  }
}

/**
 * Get a color for browser category
 * @param {string} browserType Browser type
 * @returns {string} Color code
 */
function getColorForBrowser(browserType) {
  const colors = {
    chrome: '#4285F4',   // Chrome blue
    firefox: '#FF9400',  // Firefox orange
    edge: '#0078D7',     // Edge blue
    safari: '#006CFF',   // Safari blue
    opera: '#FF1B2D',    // Opera red
    brave: '#FB542B'     // Brave orange-red
  };
  
  return colors[browserType] || '#757575'; // Default gray
}

/**
 * Check if an account is a duplicate
 * @param {object} account Account to check
 * @param {Array<object>} existingAccounts Array of existing accounts
 * @returns {boolean} True if account is a duplicate
 */
function checkForDuplicate(account, existingAccounts) {
  if (!existingAccounts || !existingAccounts.length) return false;
  
  // Check for duplicates by URL and username
  return existingAccounts.some(existing => {
    // Both URL and username must match to be considered a duplicate
    // Use lowercase comparison and strip protocol
    const normalizeUrl = (url) => {
      if (!url) return '';
      return url.toLowerCase()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/+$/, ''); // Remove trailing slashes
    };
    
    const normalizedExistingUrl = normalizeUrl(existing.url);
    const normalizedNewUrl = normalizeUrl(account.url);
    
    // If both URL and username match, it's a duplicate
    return (
      normalizedExistingUrl && 
      normalizedNewUrl &&
      normalizedExistingUrl === normalizedNewUrl &&
      existing.username === account.username
    );
  });
}

module.exports = {
  detectBrowsers,
  importFromBrowser
};