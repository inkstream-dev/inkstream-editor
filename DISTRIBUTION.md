# Inkstream Pro Plugins — Distribution Guide

> The `@inkstream/pro-plugins` package is distributed privately via **GitHub Packages**.  
> It requires a valid paid license key. Source code is **not** included in the public repository.

---

## 1. Installation

### Step 1 — Create a GitHub token

Generate a **Personal Access Token (Classic)** at  
[github.com/settings/tokens](https://github.com/settings/tokens) with the scope:

```
read:packages
```

### Step 2 — Configure `.npmrc`

Add the following to your project's `.npmrc` (or `~/.npmrc` for user-level):

```ini
@inkstream:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

> **Never commit your token.** Use an environment variable (`GITHUB_TOKEN`) or a secrets manager.

### Step 3 — Install the package

```bash
npm install @inkstream/pro-plugins
# or
pnpm add @inkstream/pro-plugins
```

---

## 2. Wiring Up Pro Plugins

Pro plugins are **injected by the consumer** via the `plugins` prop and `useLazyPlugins` hook.  
The public editor (`@inkstream/react-editor`) has **no direct dependency** on this package.

```tsx
import { useLazyPlugins, useLicenseValidation, RichTextEditor } from '@inkstream/react-editor';
import { availablePlugins } from '@inkstream/editor-core';

export default function MyEditor({ licenseKey }: { licenseKey: string }) {
  // Step 1 — Validate license against YOUR server. Never trust the client alone.
  const { tier } = useLicenseValidation({
    licenseKey,
    validationEndpoint: '/api/validate-license',
  });

  // Step 2 — Lazy-load pro plugins. They are only downloaded when the server
  //           confirms the license. Each loader receives the validated tier so
  //           it can call createProPlugins(tier) for server-enforced guarding.
  const { loadedPlugins: proPlugins } = useLazyPlugins({
    validatedTier: tier,
    lazyPlugins: [
      {
        loader: (tier) =>
          import('@inkstream/pro-plugins').then(m => ({
            table: m.createProPlugins(tier).table,
          })),
        requiredTier: 'pro',
        pluginKey: 'table',
      },
      {
        loader: (tier) =>
          import('@inkstream/pro-plugins').then(m => ({
            advancedExport: m.createProPlugins(tier).advancedExport,
          })),
        requiredTier: 'pro',
        pluginKey: 'advancedExport',
      },
      {
        loader: (tier) =>
          import('@inkstream/pro-plugins').then(m => ({
            aiAssistant: m.createProPlugins(tier).aiAssistant,
          })),
        requiredTier: 'premium',
        pluginKey: 'aiAssistant',
      },
    ],
  });

  // Step 3 — Combine free + pro plugins and pass to the editor
  const plugins = [...Object.values(availablePlugins), ...proPlugins];

  return (
    <RichTextEditor
      plugins={plugins}
      licenseKey={licenseKey}
      licenseValidationEndpoint="/api/validate-license"
    />
  );
}
```

---

## 3. Server-Side License Validation

The public editor ships with a `/api/validate-license` example in `apps/demo`.  
You must implement this endpoint in your own backend.

**Expected request:**
```json
POST /api/validate-license
{ "licenseKey": "INKSTREAM-PRO-ABC123" }
```

**Expected response:**
```json
{
  "valid": true,
  "tier": "pro",
  "expiresAt": "2026-12-31T00:00:00Z"
}
```

**Tier values:** `"free"` | `"pro"` | `"premium"`

The `tier` value returned by your server is the **single authoritative source**  
for which plugins activate. It is passed into `createProPlugins(tier)` inside  
each lazy loader, where `guardPlugin()` enforces access at runtime.

Even if someone obtains the `@inkstream/pro-plugins` package, all plugins are  
wrapped by `guardPlugin()` and will return no-op stubs unless a server-validated  
tier is provided.

---

## 4. Next.js Configuration

If you are using Next.js with `transpilePackages`, add `@inkstream/pro-plugins`:

```js
// next.config.js
const nextConfig = {
  transpilePackages: [
    '@inkstream/react-editor',
    '@inkstream/editor-core',
    '@inkstream/pro-plugins', // add this
  ],
};
```

For table styles, call `injectTableStyles()` once on mount:

```ts
useEffect(() => {
  import('@inkstream/pro-plugins').then(m => m.injectTableStyles());
}, []);
```

---

## 5. Production Checklist

- [ ] `GITHUB_TOKEN` is set as an environment variable (never hardcoded)
- [ ] `.npmrc` is **not committed** to a public repository (or uses env var interpolation)
- [ ] Your `/api/validate-license` endpoint validates keys against your database
- [ ] License keys are stored securely server-side; no tier derivation from key string on the client
- [ ] `createProPlugins(tier)` is called with the **server-returned** `tier` (not a hardcoded value)
- [ ] `@inkstream/pro-plugins` is listed in `.gitignore` exceptions or handled via lockfile correctly
- [ ] Expired / revoked licenses return `{ valid: false, tier: "free" }` from your server

---

## 6. Security Model

| Layer | What it does |
|-------|-------------|
| **Private registry** | Source code is not public; install requires authenticated token |
| **Server validation** | License key is validated by your backend; client never determines tier |
| **`guardPlugin()`** | Even if the package is obtained, each plugin checks `canTierAccess()` at runtime |
| **Lazy loading** | Pro plugin code is not even downloaded until the server confirms the tier |

No single layer is sufficient on its own. All four work together.
