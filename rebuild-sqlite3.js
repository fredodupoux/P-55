// rebuild-sqlite3.js - Script to rebuild sqlite3 for the current Electron version
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const rebuild = require('@electron/rebuild');

console.log('Rebuilding SQLite3 for Electron...');

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const electronVersion = packageJson.devDependencies.electron.replace('^', '');

console.log(`Using Electron version: ${electronVersion}`);

try {
  console.log('Rebuilding native modules...');
  rebuild.rebuild({
    buildPath: process.cwd(),
    electronVersion,
    force: true,
    only: ['sqlite3'],
  }).then(() => {
    console.log('SQLite3 rebuild completed successfully!');
  }).catch((err) => {
    console.error('SQLite3 rebuild failed:', err);
    process.exit(1);
  });
} catch (error) {
  console.error('Error during SQLite3 rebuild:', error);
  process.exit(1);
}