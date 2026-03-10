# License System Architecture

This document describes how Inkstream's license validation system works, covering the three tiers, key format, validation flow, and the runtime plugin guard.

---

## Tiers

| Tier | Description |
|------|-------------|
| `free` | Default. All open-source plugins in `@inkstream/editor-core`. No key required. |
| `pro` | Adds table editing and advanced export. Requires a valid `INKSTREAM-PRO-*` key. |
| `premium` | Everything in pro, plus AI writing assistant. Requires an `INKSTREAM-PREMIUM-*` key. |

---

## Key format

```
INKSTREAM-{TIER}-{RANDOM}

Examples:
  INKSTREAM-FREE-ABC123
  INKSTREAM-PRO-XYZ789
  INKSTREAM-PREMIUM-QRS456
```

`{RANDOM}` is an alphanumeric string (`[A-Z0-9]+`).

---

## `LicenseManager` helpers

`LicenseManager` is exported from `@inkstream/editor-core` and provides two static helpers:

```ts
import { LicenseManager } from '@inkstream/editor-core';

// Format check only — does NOT grant feature access. UX use only.
LicenseManager.isValidKeyFormat('INKSTREAM-PRO-ABC123'); // → true

// Tier comparison — determines if userTier satisfies requiredTier.
LicenseManager.canTierAccess('pro', 'pro');      // → true
LicenseManager.canTierAccess('pro', 'premium');  // → false
LicenseManager.canTierAccess('premium', 'pro');  // → true
```

`canTierAccess(userTier, requiredTier)` implements the tier hierarchy:  
`premium` ≥ `pro` ≥ `free`.

---

## Validation flow

```
User enters licenseKey
        │
        ▼
useLicenseValidation({ licenseKey, validationEndpoint })
        │
        ├─ No validationEndpoint? → tier = 'free'   (secure by default)
        ├─ Invalid key format?   → tier = 'free'   (UX feedback, no server call)
        │
        ▼
POST validationEndpoint { licenseKey }
        │
        ├─ Network error?     → tier = 'free'   (fail secure)
        ├─ isValid: false?    → tier = 'free'
        │
        ▼
{ isValid: true, tier: 'pro' }
        │
        ▼
validatedTier = 'pro'  →  passed to RichTextEditor + useLazyPlugins
```

The server response is the **single authoritative source** of the user's tier. The client-side key format check is purely for UX (to avoid sending obviously malformed keys to the server) and has no security value.

---

## Secure by default

Without a `validationEndpoint`, the tier is permanently `'free'`:

```ts
useLicenseValidation({ licenseKey: 'INKSTREAM-PRO-XYZ' })
// → { tier: 'free' }  — no endpoint, no paid access
```

This means shipping an editor without a validation endpoint is always safe.

---

## Validation endpoint contract

```ts
// POST /api/validate-license
// Request body
{ licenseKey: string }

// Success response
{ isValid: true, tier: 'free' | 'pro' | 'premium' }

// Failure response
{ isValid: false, reason?: string }
```

A minimal demo implementation lives at:  
`apps/demo/src/app/api/validate-license/route.ts`

In production, replace the hardcoded key map with a call to your database or licensing service. Return `{ isValid: false }` for expired or revoked keys.

---

## `guardPlugin()` — runtime protection in pro-plugins

Every plugin in `@inkstream/pro-plugins` is wrapped by `guardPlugin()`. This function compares the tier passed into `createProPlugins(tier)` against the plugin's `requiredTier`. If the tier is insufficient, all plugin methods (`getProseMirrorPlugins`, `getToolbarItems`, `getInputRules`, `getKeymap`) return empty stubs.

This means even if a user obtains the `@inkstream/pro-plugins` package through other means, the plugins produce no output without a server-validated tier:

```ts
// Inside @inkstream/pro-plugins
export function createProPlugins(tier: LicenseTier) {
  return {
    table: guardPlugin(tablePluginImpl, 'pro', tier),
    advancedExport: guardPlugin(advancedExportImpl, 'pro', tier),
    aiAssistant: guardPlugin(aiAssistantImpl, 'premium', tier),
  };
}
```

Always call `createProPlugins` with the tier from `useLicenseValidation` — never with a hardcoded value.

---

## Security layers summary

| Layer | Protection |
|-------|-----------|
| **Private registry** | `@inkstream/pro-plugins` is not on public npm; install requires an authenticated token |
| **Server validation** | Tier is determined server-side; client key format check is UX only |
| **`guardPlugin()`** | All pro plugin methods are no-ops unless a server-validated tier is passed |
| **Lazy loading** | Pro plugin code is not downloaded until the server confirms the tier |
| **Secure by default** | No `validationEndpoint` → always free tier |
