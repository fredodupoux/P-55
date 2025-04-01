# 🔐 P+55: A Simple Password Manager for Seniors 👵👴

## 🌟 Overview
P+55 (pass) is a user-friendly, multiplatform password manager designed specifically for older adults. It provides a simple, intuitive interface, making it easy to store and manage account credentials securely.

## ✨ Key Features
- **Two-Panel Layout** 📋:
  - List of saved accounts with search functionality 🔍
  - Account details including website/app name, username, password, link, and notes 📝
- **Master Password Protection** 🔑:
  - Secures all stored data with a single master password
  - TOTP Option
- **Accessibility** ♿:
  - Large, readable text, high contrast themes, and simple navigation
- **Security** 🛡️:
  - AES-256 encryption for local data storage
  - Password hashing
  - Auto-lock after inactivity ⏰
- **Cross-Platform** 💻📱:
  - Desktop (Windows, macOS, Linux _(coming soon)_ ) 
  - Mobile (iOS, Android) _(coming soon)_

## 🛠️ Technology Stack
### Frontend
- **Desktop**: Electron, React, Material UI
- **Mobile**: React Native, React Navigation

### Backend
- **Data Storage**: SQLite with SQLCipher for encryption
- **Security**: libsodium.js, argon2 for password hashing

### Development Tools
- TypeScript, Jest, ESLint, Prettier, GitHub Actions

## ♿ Accessibility
P+55 is designed with accessibility in mind, ensuring ease of use for seniors with vision or motor impairments.

## 🌐 Global Support
English 🇬🇧
French 🇫🇷 _(coming soon)_
Kreyol 🇭🇹 _(coming soon)_ 

## 📜 License
This project is licensed under the MIT License.
