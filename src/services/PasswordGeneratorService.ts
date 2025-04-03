/**
 * Password Generator Service for Pass+55
 * Provides functionality to generate secure passwords with configurable options
 */

export interface PasswordOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

export class PasswordGeneratorService {
  // Default password options suitable for secure passwords
  static readonly DEFAULT_OPTIONS: PasswordOptions = {
    length: 12,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true, // Enable symbols by default for more security
  };

  // Character sets used for password generation
  private static readonly UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing I/O
  private static readonly LOWERCASE_CHARS = 'abcdefghijkmnpqrstuvwxyz'; // Removed confusing l
  private static readonly NUMBER_CHARS = '23456789'; // Removed confusing 0/1
  private static readonly SYMBOL_CHARS = '!@#$%^&*-_=+?';

  /**
   * Generates a random secure password based on the provided options
   */
  static generatePassword(options: PasswordOptions = this.DEFAULT_OPTIONS): string {
    // Validate options
    const length = Math.max(8, Math.min(30, options.length)); // Enforce length between 8 and 30
    
    // Build character set based on selected options
    let charSet = '';
    if (options.includeUppercase) charSet += this.UPPERCASE_CHARS;
    if (options.includeLowercase) charSet += this.LOWERCASE_CHARS;
    if (options.includeNumbers) charSet += this.NUMBER_CHARS;
    if (options.includeSymbols) charSet += this.SYMBOL_CHARS;
    
    // Default to including lowercase if nothing selected
    if (charSet === '') charSet = this.LOWERCASE_CHARS;
    
    // Generate the password
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charSet.length);
      password += charSet[randomIndex];
    }
    
    // Ensure that requirements are met by forcing one character of each type if needed
    let finalPassword = password;
    if (options.includeUppercase && !/[A-Z]/.test(finalPassword)) {
      finalPassword = this.replaceRandomChar(finalPassword, this.UPPERCASE_CHARS);
    }
    if (options.includeLowercase && !/[a-z]/.test(finalPassword)) {
      finalPassword = this.replaceRandomChar(finalPassword, this.LOWERCASE_CHARS);
    }
    if (options.includeNumbers && !/[0-9]/.test(finalPassword)) {
      finalPassword = this.replaceRandomChar(finalPassword, this.NUMBER_CHARS);
    }
    if (options.includeSymbols && !/[!@#$%^&*\-_=+?]/.test(finalPassword)) {
      finalPassword = this.replaceRandomChar(finalPassword, this.SYMBOL_CHARS);
    }
    
    return finalPassword;
  }
  
  /**
   * Replaces a random character in the password with a character from the specified set
   */
  private static replaceRandomChar(password: string, charSet: string): string {
    const position = Math.floor(Math.random() * password.length);
    const randomChar = charSet[Math.floor(Math.random() * charSet.length)];
    
    return (
      password.substring(0, position) + randomChar + password.substring(position + 1)
    );
  }
}

export default PasswordGeneratorService;