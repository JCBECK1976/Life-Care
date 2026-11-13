# Lifecare Companion™ — Payments Compliance Statement

> **DRAFT — for legal review before any users other than JC and Becks.** No payments are taken today. This states the intended approach for future paid features.

Last updated: 13 November 2026 (draft 1)

## 1. Current position
The app takes **no payments** and stores **no payment data**.

## 2. Planned paid features
- **Companion Energy packs:** one-off top-ups of AI usage.
- **Subscriptions:** tiers to be agreed (plan item G7).

These are planned for Step 6, together with a server-side AI proxy (plan items G4, G5).

## 3. How payments will be handled
- **Provider:** all payments will be taken by a **third-party payment provider**. Options: Google Play Billing, Apple In-App Purchase, or Stripe (hosted checkout) for the web app. [Provider: TBC.]
- **Card data never touches our systems:**
  - Card numbers and security codes are entered only on the provider's own payment pages or app-store sheets.
  - We receive only a confirmation: what was bought, a provider reference and the status.

## 4. PCI DSS
- **Scope:** card data is held only by the payment provider, which is responsible for PCI DSS compliance of its systems.
- **Our expected obligation:**
  - **App-store billing (Google Play / Apple):** the store is the merchant of record and handles card data. We have no card-data scope.
  - **Stripe hosted checkout or payment links (web):** we expect to qualify for **SAQ A** (all card handling outsourced; no card data stored, processed or transmitted by us). We would complete the SAQ A each year.
- **PA-DSS:** not applicable. It was retired (replaced by the PCI Secure Software Standard), and we do not build payment software.

## 5. Other obligations to confirm before launch
- Consumer law: pre-contract information, cancellation rights for digital content, subscription renewal reminders.
- VAT on digital services.
- Refund policy.
- Payments wording in the [Terms of Use](TERMS_OF_USE.md) and [Privacy Notice](PRIVACY_NOTICE.md), naming the provider as a processor or controller.

[All to be confirmed with legal/accounting review.]
