/**
 * OmniPay - Client Application Logic
 * Accessible UI Controller, Focus Management, and Live Region Updates
 */

(function () {
  'use strict';

  // Instantiate Modules
  const validator = window.LuhnValidator;
  const engine = new window.PaymentEngine();

  // DOM Elements
  const form = document.getElementById('payment-form');
  const cardInput = document.getElementById('cc-number');
  const nameInput = document.getElementById('cc-name');
  const expInput = document.getElementById('cc-exp');
  const cscInput = document.getElementById('cc-csc');
  const submitBtn = document.getElementById('submit-payment');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');
  const btnText = submitBtn.querySelector('.btn-text');
  const brandBadge = document.getElementById('brand-badge');
  const brandDisplay = document.getElementById('card-brand-display');
  const cardValidityIcon = document.getElementById('card-validity-icon');
  const srAnnouncer = document.getElementById('sr-announcer');
  const formBanner = document.getElementById('form-banner');

  // Dialog Elements
  const dialog = document.getElementById('confirmation-dialog');
  const closeDialogBtn = document.getElementById('close-dialog-btn');
  const receiptTxId = document.getElementById('receipt-txid');
  const receiptAuth = document.getElementById('receipt-auth');
  const receiptCard = document.getElementById('receipt-card');
  const receiptIdempotency = document.getElementById('receipt-idempotency');

  // A11y Toggles
  const contrastBtn = document.getElementById('toggle-contrast');
  const fontBtn = document.getElementById('toggle-font');

  // Usability Monitor Stats
  const statKeystrokes = document.getElementById('stat-keystrokes');
  const statErrors = document.getElementById('stat-errors');
  const statLatency = document.getElementById('stat-latency');
  let keystrokeCount = 0;
  let totalErrors = 0;

  // Active Idempotency Key per session
  let currentIdempotencyKey = engine.generateIdempotencyKey();
  let lastAnnouncedBrand = '';

  /**
   * Broadcasts an announcement to screen readers using ARIA live region.
   * @param {string} message
   * @param {'polite' | 'assertive'} politeness
   */
  function announce(message, politeness = 'polite') {
    if (!srAnnouncer) return;
    srAnnouncer.setAttribute('aria-live', politeness);
    srAnnouncer.textContent = '';
    // Small timeout ensures screen readers catch the text mutation
    setTimeout(() => {
      srAnnouncer.textContent = message;
    }, 50);
  }

  /**
   * Updates error state and ARIA attributes for a specific input field.
   * @param {HTMLInputElement} input
   * @param {string} errorElementId
   * @param {string} message
   */
  function setFieldError(input, errorElementId, message) {
    const errorEl = document.getElementById(errorElementId);
    if (!errorEl) return;

    if (message) {
      input.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
      totalErrors++;
      if (statErrors) statErrors.textContent = totalErrors;
    } else {
      input.removeAttribute('aria-invalid');
      errorEl.textContent = '';
    }
  }

  /**
   * Updates keystroke usability metrics.
   */
  function registerKeystroke() {
    keystrokeCount++;
    if (statKeystrokes) statKeystrokes.textContent = keystrokeCount;
  }

  // ---------------------------------------------------------------------------
  // Input Formatting & Validation Event Handlers
  // ---------------------------------------------------------------------------

  // Card Number Real-Time Formatting & Brand Detection
  cardInput.addEventListener('input', (e) => {
    registerKeystroke();
    const cursor = e.target.selectionStart;
    const rawVal = e.target.value;

    const formatted = validator.formatCardSpacing(rawVal);
    e.target.value = formatted;

    const clean = validator.sanitize(formatted);
    const brandInfo = validator.detectBrand(clean);

    // Update Brand Badge
    brandBadge.className = `brand-badge brand-${brandInfo.brand}`;
    brandBadge.textContent = brandInfo.name;
    brandDisplay.setAttribute('aria-label', `Detected card type: ${brandInfo.name}`);

    // Live announcement when brand changes
    if (brandInfo.name !== lastAnnouncedBrand && clean.length >= 2) {
      lastAnnouncedBrand = brandInfo.name;
      announce(`${brandInfo.name} card detected.`);
    }

    // Dynamic Validity Status
    if (clean.length >= 13) {
      const isValid = validator.validate(clean);
      if (isValid) {
        setFieldError(cardInput, 'num-error', '');
        cardValidityIcon.innerHTML = '✓';
        cardValidityIcon.style.color = 'var(--color-success)';
      } else {
        cardValidityIcon.innerHTML = '';
      }
    } else {
      cardValidityIcon.innerHTML = '';
    }
  });

  cardInput.addEventListener('blur', () => {
    const clean = validator.sanitize(cardInput.value);
    if (!clean) {
      setFieldError(cardInput, 'num-error', 'Card number is required.');
      return;
    }
    if (clean.length < 13 || !validator.validate(clean)) {
      setFieldError(cardInput, 'num-error', 'Please enter a valid card number (checksum mismatch).');
    } else {
      setFieldError(cardInput, 'num-error', '');
    }
  });

  // Name Validation
  nameInput.addEventListener('input', registerKeystroke);
  nameInput.addEventListener('blur', () => {
    const val = nameInput.value.trim();
    if (!val) {
      setFieldError(nameInput, 'name-error', 'Cardholder name is required.');
    } else if (val.length < 2) {
      setFieldError(nameInput, 'name-error', 'Cardholder name is too short.');
    } else {
      setFieldError(nameInput, 'name-error', '');
    }
  });

  // Expiry Date Real-Time Formatting
  expInput.addEventListener('input', (e) => {
    registerKeystroke();
    e.target.value = validator.formatExpiry(e.target.value);
    if (e.target.value.length === 5) {
      const check = validator.validateExpiry(e.target.value);
      setFieldError(expInput, 'exp-error', check.valid ? '' : check.message);
    }
  });

  expInput.addEventListener('blur', () => {
    const check = validator.validateExpiry(expInput.value.trim());
    setFieldError(expInput, 'exp-error', check.valid ? '' : check.message);
  });

  // Security Code (CVV) Validation
  cscInput.addEventListener('input', registerKeystroke);
  cscInput.addEventListener('blur', () => {
    const clean = cscInput.value.replace(/\D/g, '');
    const cleanCard = validator.sanitize(cardInput.value);
    const brand = validator.detectBrand(cleanCard);

    if (!clean) {
      setFieldError(cscInput, 'csc-error', 'Security code is required.');
    } else if (clean.length < brand.codeLength) {
      setFieldError(cscInput, 'csc-error', `${brand.name} requires a ${brand.codeLength}-digit security code.`);
    } else {
      setFieldError(cscInput, 'csc-error', '');
    }
  });

  // ---------------------------------------------------------------------------
  // Form Submission & Authorization
  // ---------------------------------------------------------------------------

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formBanner.classList.add('hidden');

    // Trigger validation on all fields
    const cleanCard = validator.sanitize(cardInput.value);
    const isCardValid = validator.validate(cleanCard);
    const isNameValid = nameInput.value.trim().length >= 2;
    const expCheck = validator.validateExpiry(expInput.value.trim());
    const brand = validator.detectBrand(cleanCard);
    const cleanCsc = cscInput.value.replace(/\D/g, '');
    const isCscValid = cleanCsc.length >= brand.codeLength;

    if (!isNameValid) setFieldError(nameInput, 'name-error', 'Cardholder name is required.');
    if (!isCardValid) setFieldError(cardInput, 'num-error', 'Please enter a valid card number.');
    if (!expCheck.valid) setFieldError(expInput, 'exp-error', expCheck.message);
    if (!isCscValid) setFieldError(cscInput, 'csc-error', `Please enter a valid ${brand.codeLength}-digit code.`);

    // If invalid, focus first error input per WCAG 3.3.1
    if (!isNameValid) {
      nameInput.focus();
      announce('Form contains errors. Please correct Cardholder Name.', 'assertive');
      return;
    }
    if (!isCardValid) {
      cardInput.focus();
      announce('Form contains errors. Invalid card number.', 'assertive');
      return;
    }
    if (!expCheck.valid) {
      expInput.focus();
      announce('Form contains errors. Invalid expiry date.', 'assertive');
      return;
    }
    if (!isCscValid) {
      cscInput.focus();
      announce('Form contains errors. Invalid security code.', 'assertive');
      return;
    }

    // Begin Submission Process
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    btnSpinner.classList.remove('hidden');
    btnText.textContent = 'Authorizing Payment...';
    announce('Processing secure card authorization via VisaNet...', 'assertive');

    try {
      const receipt = await engine.processPayment({
        name: nameInput.value.trim(),
        cardNumber: cleanCard,
        expiry: expInput.value.trim(),
        cvv: cleanCsc,
        amount: 120.00
      }, currentIdempotencyKey);

      // Update Usability stats
      if (statLatency) statLatency.textContent = `${receipt.latencyMs} ms`;

      // Populate Receipt Dialog
      receiptTxId.textContent = receipt.transactionId;
      receiptAuth.textContent = receipt.authorizationCode;
      receiptCard.textContent = receipt.maskedCard;
      receiptIdempotency.textContent = receipt.idempotencyKey;

      // Reset Button State
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      btnSpinner.classList.add('hidden');
      btnText.textContent = 'Pay $120.00 USD';

      // Open Modal with Accessible Focus Management
      openReceiptModal();
      announce('Payment authorized successfully. Receipt dialog opened.', 'assertive');

      // Generate a new idempotency key for subsequent transactions
      currentIdempotencyKey = engine.generateIdempotencyKey();

    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      btnSpinner.classList.add('hidden');
      btnText.textContent = 'Pay $120.00 USD';

      formBanner.textContent = 'Payment Authorization Failed. Please check your card information and try again.';
      formBanner.classList.remove('hidden');
      formBanner.focus();
      announce('Payment Authorization Failed.', 'assertive');
    }
  });

  // ---------------------------------------------------------------------------
  // Accessible Dialog / Focus Trap Management (WCAG 2.4.3 Focus Order)
  // ---------------------------------------------------------------------------

  function openReceiptModal() {
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      // Fallback for older browsers
      dialog.setAttribute('open', '');
    }
    closeDialogBtn.focus();
  }

  function closeReceiptModal() {
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    submitBtn.focus();
    announce('Receipt dialog closed.', 'polite');
  }

  closeDialogBtn.addEventListener('click', closeReceiptModal);

  // Trap focus inside modal
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeReceiptModal();
    } else if (e.key === 'Tab') {
      const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Accessibility Toggles (High Contrast & Large Text)
  // ---------------------------------------------------------------------------

  contrastBtn.addEventListener('click', () => {
    const isPressed = contrastBtn.getAttribute('aria-pressed') === 'true';
    contrastBtn.setAttribute('aria-pressed', String(!isPressed));
    document.body.classList.toggle('high-contrast');
    announce(`High contrast mode ${!isPressed ? 'enabled' : 'disabled'}.`);
  });

  fontBtn.addEventListener('click', () => {
    const isPressed = fontBtn.getAttribute('aria-pressed') === 'true';
    fontBtn.setAttribute('aria-pressed', String(!isPressed));
    document.body.classList.toggle('large-text');
    announce(`Large text mode ${!isPressed ? 'enabled' : 'disabled'}.`);
  });

})();
