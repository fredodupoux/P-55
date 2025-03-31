# P+55: A Simple Password Manager for Seniors

## Overview
P+55 is a user-friendly, multiplatform password manager designed specifically for older adults. It provides a simple, intuitive interface similar to a notes app, making it easy to store and manage account credentials securely.

## Key Features
- **Two-Panel Layout**:
  - Left Panel: List of saved accounts with search functionality.
  - Right Panel: Account details including website/app name, username, password, link, and notes.
- **Master Password Protection**:
  - Secures all stored data with a single master password.
- **Accessibility**:
  - Large, readable text, high contrast themes, and simple navigation.
- **Security**:
  - AES-256 encryption for local data storage.
  - Auto-lock after inactivity.
- **Cross-Platform**:
  - Desktop (Windows, macOS, Linux) and Mobile (iOS, Android).

## Technology Stack
### Frontend
- **Desktop**: Electron, React, Material UI
- **Mobile**: React Native, React Navigation

### Backend
- **Data Storage**: SQLite with SQLCipher for encryption
- **Security**: libsodium.js, argon2 for password hashing

### Development Tools
- TypeScript, Jest, ESLint, Prettier, GitHub Actions

## Development Phases
1. **Core Desktop Application**: Basic functionality and UI.
2. **Enhanced Features**: Backup, password generation, and refinements.
3. **Mobile Applications**: iOS and Android versions with biometric authentication.

## Accessibility
P+55 is designed with accessibility in mind, ensuring ease of use for seniors with vision or motor impairments.

## License
This project is licensed under the MIT License.
