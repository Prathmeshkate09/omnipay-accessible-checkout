/**
 * OmniPay - Luhn Algorithm & Card Identification Engine
 * Implements ISO/IEC 7812 Modulus 10 Checksum Algorithm
 */

class LuhnValidator {
  /**
   * Sanitizes card input string by removing non-numeric characters.
   * @param {string} rawCardNumber
   * @returns {string}
   */
  static sanitize(rawCardNumber) {
    if (!rawCardNumber) return '';
    return String(rawCardNumber).replace(/\D/g, '');
  }

  /**
   * Validates a card number using the Luhn Algorithm (Mod 10).
   * @param {string} cardNumber - Clean digits string
   * @returns {boolean}
   */
  static validate(cardNumber) {
    const digits = this.sanitize(cardNumber);
    if (!digits || digits.length < 13 || digits.length > 19) {
      return false;
    }

    let sum = 0;
    let shouldDouble = false;

    // Loop through digits from right to left
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Detects the payment card brand based on Issuer Identification Number (IIN) / BIN regexes.
   * Prioritizes Visa (Starts with 4).
   * @param {string} cardNumber
   * @returns {{ brand: string, name: string, codeLength: number }}
   */
  static detectBrand(cardNumber) {
    const clean = this.sanitize(cardNumber);

    // Visa: Starts with 4
    if (/^4/.test(clean)) {
      return { brand: 'visa', name: 'Visa', codeLength: 3 };
    }
    // Mastercard: 51-55 or 2221-2720
    if (/^(5[1-5]|2[2-7])/.test(clean)) {
      return { brand: 'mastercard', name: 'Mastercard', codeLength: 3 };
    }
    // American Express: 34 or 37
    if (/^3[47]/.test(clean)) {
      return { brand: 'amex', name: 'American Express', codeLength: 4 };
    }
    // Discover: 6011, 622126-622925, 644-649, 65
    if (/^(6011|65|64[4-9]|622)/.test(clean)) {
      return { brand: 'discover', name: 'Discover', codeLength: 3 };
    }

    return { brand: 'unknown', name: 'Card', codeLength: 3 };
  }

  /**
   * Formats raw digits with standard 4-digit card chunk spacing (e.g. 4000 1234 5678 9010)
   * @param {string} input
   * @returns {string}
   */
  static formatCardSpacing(input) {
    const digits = this.sanitize(input);
    const brand = this.detectBrand(digits);

    // AmEx 4-6-5 spacing format
    if (brand.brand === 'amex') {
      const parts = [];
      if (digits.length > 0) parts.push(digits.substring(0, 4));
      if (digits.length > 4) parts.push(digits.substring(4, 10));
      if (digits.length > 10) parts.push(digits.substring(10, 15));
      return parts.join(' ');
    }

    // Standard 4-4-4-4 spacing format (Visa, Mastercard, etc.)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  /**
   * Formats MM/YY expiry date with automatic forward slash
   * @param {string} input
   * @returns {string}
   */
  static formatExpiry(input) {
    const digits = input.replace(/\D/g, '').substring(0, 4);
    if (digits.length >= 3) {
      return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
    }
    return digits;
  }

  /**
   * Validates if expiry date MM/YY is in the future.
   * @param {string} expString
   * @returns {{ valid: boolean, message: string }}
   */
  static validateExpiry(expString) {
    if (!expString || !/^\d{2}\/\d{2}$/.test(expString)) {
      return { valid: false, message: 'Please enter a valid expiry date (MM/YY).' };
    }

    const [monthStr, yearStr] = expString.split('/');
    const month = parseInt(monthStr, 10);
    const year = parseInt(`20${yearStr}`, 10);

    if (month < 1 || month > 12) {
      return { valid: false, message: 'Expiry month must be between 01 and 12.' };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return { valid: false, message: 'Card has expired.' };
    }

    if (year > currentYear + 25) {
      return { valid: false, message: 'Expiry year is too far in the future.' };
    }

    return { valid: true, message: '' };
  }
}

// Support both Browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LuhnValidator;
} else {
  window.LuhnValidator = LuhnValidator;
}
