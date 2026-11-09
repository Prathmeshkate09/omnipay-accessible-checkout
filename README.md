# OmniPay - Accessible Digital Payment Checkout & Verification Engine

[![WCAG 2.1 Level AA](https://img.shields.io/badge/WCAG%202.1-Level%20AA-blue.svg)](https://www.w3.org/WAI/WCAG21/quickref/)
[![Section 508](https://img.shields.io/badge/Accessibility-Section%20508-green.svg)](https://www.section508.gov/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An accessible, responsive, and resilient Web Payment Checkout Portal built specifically for digital payment ecosystems (inspired by **VisaNet** and **Visa Checkout / Click to Pay**). Designed from the ground up to satisfy **WCAG 2.1 Level AA / AAA standards**, **Section 508**, and modern payment security requirements.

---

## Key Features

1. **Accessibility-First Engineering (WCAG 2.1 AA / Section 508)**:
   - **Accessible Semantic HTML5**: Fully structured forms with `<label for="...">`, `autocomplete="cc-number"`, `inputmode="numeric"`, and persistent format hints above inputs linked via `aria-describedby`.
   - **Live Screen Reader Announcements**: Dynamic `role="status"` and `aria-live="polite"` regions announcing card brand detection, form error guidance, and transaction authorization statuses.
   - **Keyboard Navigation & Focus Management**: Universal `:focus-visible` styling with 3px high-contrast rings, skip-to-content links, and keyboard focus trapping within modal dialogs (`Tab` / `Shift+Tab` / `Escape`).
   - **High Contrast & Large Text Toggles**: Built-in interactive modes delivering 15.8:1 contrast ratios (exceeding WCAG AAA 7:1) and adaptive typography.
   - **Vestibular Motion Safety**: Honors `prefers-reduced-motion` media queries across all animations and transitions.

2. **Core Payment Logic & Security**:
   - **ISO/IEC 7812 Luhn Algorithm**: Object-Oriented JavaScript engine verifying card checksums in real-time.
   - **Real-Time BIN & Brand Detection**: Instant regex recognition for Visa (BIN `4xxx`), Mastercard, American Express, and Discover.
   - **Client-Side Tokenization**: Sanitizes and masks Primary Account Numbers (PANs) into secure tokens (`tok_visa_...`), preventing raw card transmission.
   - **Idempotency Key Engine**: Generates unique RFC-4122 UUID v4 idempotency keys to protect users against accidental double billing or network retry issues.

3. **Usability & User-Centered Design (UCD)**:
   - Real-time usability telemetry monitor displaying keystroke counts, error correction rates, and simulated VisaNet authorization latencies.

---

## Architecture Overview

```
omnipay-accessible-checkout/
├── index.html              # Accessible semantic markup, ARIA live regions, dialog modal
├── css/
│   └── styles.css          # Responsive design, WCAG AAA color palette, focus indicators
├── js/
│   ├── luhn.js             # Luhn algorithm (Mod 10), BIN identification, input formatters
│   ├── payment-engine.js   # Client tokenization, idempotency generator, VisaNet simulation
│   └── app.js              # Accessible DOM controller, focus trap, screen-reader announcer
├── tests/
│   └── test_suite.py       # Automated test suite (Luhn checks, Idempotency, HTML A11y audit)
└── README.md               # Project documentation and specifications
```

---

## Accessibility Compliance Checklist

| Standard | Criterion | Implementation |
| :--- | :--- | :--- |
| **WCAG 1.3.1** | Info & Relationships | All inputs have explicit `<label>`, `aria-describedby`, and `aria-required`. |
| **WCAG 1.4.3** | Contrast (Minimum) | Standard mode achieves > 8:1; High-contrast mode achieves > 15:1. |
| **WCAG 2.1.1** | Keyboard Navigation | 100% reachable via keyboard. Interactive skip-link for quick bypass. |
| **WCAG 2.4.3** | Focus Order | Dialog modal traps focus strictly within the dialog until dismissed. |
| **WCAG 3.3.1** | Error Identification | Validation errors are announced in live regions and shift focus to invalid input. |
| **WCAG 4.1.3** | Status Messages | `aria-live` regions provide real-time updates without moving focus. |

---

## Running the Automated Test Suite

Run the Python verification suite:

```bash
python tests/test_suite.py
```

Expected output:
```
=== OmniPay Project Quality & Verification Suite ===
[RUNNING] 1. Testing Luhn Algorithm & Card Detection...
   [PASS] Luhn algorithm correctly validated Visa numbers and rejected invalid checksums.
[RUNNING] 2. Testing Payment Engine & Idempotency Key logic...
   [PASS] Tokenization sanitizes raw PAN and idempotency keys are unique.
[RUNNING] 3. Auditing HTML Semantic & WCAG 2.1 AA Compliance...
   [PASS] HTML audit passed: 100% label associations, ARIA live regions, skip-links, and semantic dialog verified.
=== ALL TESTS PASSED SUCCESSFULLY! ===
```

---

## Live Demo & Usage

1. Open `index.html` in any modern web browser.
2. Use test Visa card: `4242 4242 4242 4242` or `4532 0150 0000 0007` with any future expiry date (e.g., `12/28`) and CVV (`123`).
3. Press `Tab` to navigate using only keyboard, and test screen readers (NVDA / VoiceOver).
