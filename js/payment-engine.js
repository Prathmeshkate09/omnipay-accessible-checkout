/**
 * OmniPay - Payment Gateway & Tokenization Engine
 * Simulates VisaNet Authorization, Client Tokenization, and Idempotent Request Handling
 */

class PaymentEngine {
  constructor() {
    this.processedTransactions = new Map();
  }

  /**
   * Generates an RFC-4122 compliant UUID v4 idempotency key.
   * Ensures identical client retries produce identical responses without double charging.
   * @returns {string}
   */
  generateIdempotencyKey() {
    return 'idemp_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Simulates client-side tokenization.
   * Replaces raw Primary Account Number (PAN) with a secure temporary token before transmission.
   * @param {string} cleanPAN
   * @param {string} brand
   * @returns {string}
   */
  tokenize(cleanPAN, brand) {
    const last4 = cleanPAN.slice(-4);
    const randomHex = Math.random().toString(16).substring(2, 10);
    return `tok_${brand.toLowerCase()}_${last4}_${randomHex}`;
  }

  /**
   * Simulates end-to-end payment authorization.
   * @param {Object} paymentData
   * @param {string} paymentData.name
   * @param {string} paymentData.cardNumber
   * @param {string} paymentData.expiry
   * @param {string} paymentData.cvv
   * @param {number} paymentData.amount
   * @param {string} idempotencyKey
   * @returns {Promise<Object>}
   */
  async processPayment(paymentData, idempotencyKey) {
    const startTime = performance.now();

    // Idempotency check: if this key has already been processed, return existing receipt
    if (this.processedTransactions.has(idempotencyKey)) {
      const existing = this.processedTransactions.get(idempotencyKey);
      return {
        ...existing,
        replayed: true,
        latencyMs: Math.round(performance.now() - startTime)
      };
    }

    const cleanPAN = paymentData.cardNumber.replace(/\D/g, '');
    const brandInfo = (typeof LuhnValidator !== 'undefined')
      ? LuhnValidator.detectBrand(cleanPAN)
      : { brand: 'visa', name: 'Visa' };

    // Step 1: Client Tokenization
    const token = this.tokenize(cleanPAN, brandInfo.brand);
    const maskedCard = `•••• •••• •••• ${cleanPAN.slice(-4)}`;

    // Step 2: Simulated Network Latency (VisaNet round-trip: 120ms - 260ms)
    const simulatedLatency = Math.floor(Math.random() * 140) + 120;
    await new Promise(resolve => setTimeout(resolve, simulatedLatency));

    // Step 3: Simulated Risk & Approval Check
    const authCode = 'VNET-' + Math.floor(100000 + Math.random() * 900000);
    const transactionId = 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const receipt = {
      success: true,
      transactionId,
      authorizationCode: authCode,
      status: 'AUTHORIZED',
      maskedCard: `${brandInfo.name} (${maskedCard})`,
      token,
      idempotencyKey,
      amount: paymentData.amount || 120.00,
      timestamp: new Date().toISOString(),
      network: 'VisaNet Simulated Network',
      latencyMs: Math.round(performance.now() - startTime)
    };

    // Store in idempotency cache
    this.processedTransactions.set(idempotencyKey, receipt);

    return receipt;
  }
}

// Support both Browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentEngine;
} else {
  window.PaymentEngine = PaymentEngine;
}
