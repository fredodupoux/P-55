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
 * @returns {Promise<Object>} Import result
 */
async function importFromBrowser(browserType, database, dialog, window) {
  try {
    let importedCount = 0;
    let result;
    
    // Different import logic based on browser type
    switch (browserType) {
      case 'chrome':
        result = await importFromChrome(database, dialog, window);
        break;
      case 'firefox':
        result = await importFromFirefox(database, dialog, window);
        break;
      case 'edge':
        result = await importFromEdge(database, dialog, window);
        break;
      case 'brave':
        result = await importFromBrave(database, dialog, window);
        break;
      case 'safari':
        result = await importFromSafari(database, dialog, window);
        break;
      case 'opera':
        result = await importFromOpera(database, dialog, window);
        break;
      default:
        return { success: false, imported: 0, error: `Unsupported browser type: ${browserType}` };
    }
    
    if (result && result.success) {
      importedCount = result.imported;
    } else {
      throw new Error(result?.error || `Failed to import from ${browserType}`);
    }
    
    return { 
      success: true, 
      imported: importedCount,
      message: `Successfully imported ${importedCount} passwords from ${browserType}`
    };
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
 * @returns {Promise<Object>} Import result
 */
async function importFromChrome(database, dialog, window) {
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
    
    return importFromCSV(result.filePaths[0], database);
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
 * @returns {Promise<Object>} Import result
 */
async function importFromFirefox(database, dialog, window) {
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
    
    return importFromCSV(result.filePaths[0], database);
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
 * @returns {Promise<Object>} Import result
 */
async function importFromEdge(database, dialog, window) {
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
    
    return importFromCSV(result.filePaths[0], database);
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
 * @returns {Promise<Object>} Import result
 */
async function importFromBrave(database, dialog, window) {
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
    
    return importFromCSV(result.filePaths[0], database);
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
 * @returns {Promise<Object>} Import result
 */
async function importFromSafari(database, dialog, window) {
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
  
  return importFromCSV(result.filePaths[0], database);
}

/**
 * Import passwords from Opera
 * @param {object} database The database instance
 * @param {object} dialog Electron dialog module
 * @param {object} window The main window instance
 * @returns {Promise<Object>} Import result
 */
async function importFromOpera(database, dialog, window) {
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
    
    return importFromCSV(result.filePaths[0], database);
  } catch (error) {
    console.error('Error importing from Opera:', error);
    return { success: false, imported: 0, error: error.message };
  }
}

/**
 * Import passwords from a CSV file
 * @param {string} filePath Path to the CSV file
 * @param {object} database The database instance
 * @returns {Promise<Object>} Import result
 */
async function importFromCSV(filePath, database) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    
    if (lines.length <= 1) {
      return { success: false, imported: 0, error: 'No data found in the CSV file' };
    }
    
    // First line is header
    const header = lines[0].split(',');
    
    // Find column indices based on common headers in different browser exports
    const urlIndex = findColumnIndex(header, ['url', 'web site', 'website', 'origin', 'origin_url']);
    const usernameIndex = findColumnIndex(header, ['username', 'name', 'login', 'user', 'login_username']);
    const passwordIndex = findColumnIndex(header, ['password', 'pass', 'pwd', 'password_value']);
    
    if (urlIndex === -1 || usernameIndex === -1 || passwordIndex === -1) {
      return { 
        success: false, 
        imported: 0, 
        error: 'CSV format not recognized. Please make sure it contains URL, username, and password columns.' 
      };
    }
    
    let importedCount = 0;
    const errors = [];
    
    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      try {
        // Handle quoted CSV properly
        const values = parseCSVLine(lines[i]);
        
        if (values.length <= Math.max(urlIndex, usernameIndex, passwordIndex)) {
          continue; // Skip malformed lines
        }
        
        const url = values[urlIndex].trim().replace(/^"|"$/g, '');
        const username = values[usernameIndex].trim().replace(/^"|"$/g, '');
        const password = values[passwordIndex].trim().replace(/^"|"$/g, '');
        
        if (!url || !username || !password) {
          continue; // Skip entries with missing data
        }
        
        // Parse domain from URL
        let domain = '';
        try {
          const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
          domain = urlObj.hostname;
        } catch (e) {
          domain = url; // If URL parsing fails, use the original string
        }
        
        // Generate a user-friendly account name
        const accountName = domain ? `${domain} (${username})` : `Imported Account - ${username}`;
        
        // Add to database with proper 'name' field instead of 'title'
        await database.addAccount({
          name: accountName, // This is the key fix - use 'name' instead of 'title'
          username: username,
          password: password,
          url: url,
          notes: `Imported from browser on ${new Date().toLocaleDateString()}`,
          category: 'Imported'
        });
        
        importedCount++;
      } catch (error) {
        console.error(`Error processing line ${i}:`, error);
        errors.push(`Line ${i}: ${error.message}`);
      }
    }
    
    if (importedCount === 0 && errors.length > 0) {
      return { success: false, imported: 0, error: 'Failed to import any passwords. ' + errors[0] };
    }
    
    return { success: true, imported: importedCount };
  } catch (error) {
    console.error('Error importing from CSV:', error);
    return { success: false, imported: 0, error: error.message };
  }
}

/**
 * Find column index in CSV header by possible names
 * @param {Array<string>} header CSV header array
 * @param {Array<string>} possibleNames Possible column names
 * @returns {number} Column index or -1 if not found
 */
function findColumnIndex(header, possibleNames) {
  for (const name of possibleNames) {
    const index = header.findIndex(h => 
      h.toLowerCase().trim().replace(/^"|"$/g, '').includes(name.toLowerCase())
    );
    if (index !== -1) return index;
  }
  return -1;
}

/**
 * Parse a CSV line respecting quoted values
 * @param {string} line CSV line
 * @returns {Array<string>} Array of values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle quotes state
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      // Regular character
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

module.exports = {
  detectBrowsers,
  importFromBrowser
};