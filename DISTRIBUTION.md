# Inkstream Pro Plugins — Distribution Guide

The `@inkstream/pro-plugins` package is distributed via a **private npm registry**.  
It requires a valid paid license. Source code is not included in the public repository.

---

## 1. Installation

### Step 1 — Receive your npm token

After purchase, you will receive a scoped npm token granting read access to `@inkstream/pro-plugins`. Keep this token secure — treat it like a password.

### Step 2 — Configure `.npmrc`

Add the following to your project's `.npmrc` (or `~/.npmrc` for user-level configuration):

```ini
@inkstream:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${INKSTREAM_NPM_TOKEN}
```

> **Never commit your token.** Use an environment variable (`INKSTREAM_NPM_TOKEN`) or a secrets manager.

### Step 3 — Install the package

```bash
npm install @inkstream/pro-plugins
# or
pnpm add @inkstream/pro-plugins
```

---

## 2. Wiring Up Pro Plugins

Pro plugins are injected by the consumer via the `plugins` prop and the `useLazyPlugins` hook.  
The public editor (`@inkstream/react-editor`) has no direct dependency on `@inkstream-dev/pro-plugins`.

```tsx
import { useLazyPlugins, useLicenseValidation, RichTextEditor } from '@inkstream/react-editor';
import { availablePlugins } from '@inkstream/editor-core';

export default function MyEditor({ licenseKey }: { licenseKey: string }) {
  // Step 1 — Validate the license against your server. The client never determines tier.
  const { tier } = useLicenseValidation({
    licenseKey,
    validationEndpoint: '/api/validate-license',
  });

  // Step 2 — Lazy-load pro plugins. Code is only downloaded when the server
  //           confirms the license. Each loader receives the validated tier so
  //           it can call createProPlugins(tier) for server-enforced guarding.
  const { loadedPlugins: proPlugins } = useLazyPlugins({
    validatedTier: tier,
    lazyPlugins: [
      {
        loader: (t) =>
          import('@inkstream-dev/pro-plugins').then(m => ({
            table: m.createProPlugins(t).table,
          })),
        requiredTier: 'pro',
        pluginKey: 'table',
      },
      {
        loader: (t) =>
          import('@inkstream-dev/pro-plugins').then(m => ({
            advancedExport: m.createProPlugins(t).advancedExport,
          })),
        requiredTier: 'pro',
        pluginKey: 'advancedExport',
      },
      {
        loader: (t) =>
          import('@inkstream-dev/pro-plugins').then(m => ({
            aiAssistant: m.createProPlugins(t).aiAssistant,
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

You must implement a `/api/validate-license` endpoint in your own backend. The public editor ships a minimal example at `apps/demo/src/app/api/validate-license/route.ts`.

**Request:**
```json
POST /api/validate-license
{ "licenseKey": "INKSTREAM-PRO-ABC123" }
```

**Response:**
```json
{ "isValid": true, "tier": "pro" }
```

**Tier values:** `"free"` | `"pro"` | `"premium"`

The `tier` value returned by your server is the single authoritative source for which plugins activate. It is passed into `createProPlugins(tier)` inside each lazy loader, where `guardPlugin()` enforces access at runtime.

Even if someone obtains the `@inkstream-dev/pro-plugins` package, all plugins are wrapped by `guardPlugin()` and return no-op stubs unless a server-validated tier is provided.

---

## 4. Next.js Configuration

If you are using Next.js with `transpilePackages`, add `@inkstream/pro-plugins`:

```js
// next.config.js
const nextConfig = {
  transpilePackages: [
    '@inkstream/react-editor',
    '@inkstream/editor-core',
    '@inkstream-dev/pro-plugins',
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

- [ ] `INKSTREAM_NPM_TOKEN` is set as an environment variable (never hardcoded)
- [ ] `.npmrc` is **not committed** to a public repository (or uses env var interpolation)
- [ ] Your `/api/validate-license` endpoint validates keys against your database
- [ ] License keys are stored securely server-side; tier is never derived from the key string on the client
- [ ] `createProPlugins(tier)` is called with the **server-returned** `tier` (not a hardcoded value)
- [ ] Expired or revoked licenses return `{ isValid: false, tier: "free" }` from your server

---

## 6. Security Model

| Layer | What it does |
|-------|-------------|
| **Private registry** | Package is not on public npm; install requires an authenticated token |
| **Server validation** | License key is validated by your backend; the client never determines tier |
| **`guardPlugin()`** | Even if the package is obtained, each plugin checks `canTierAccess()` at runtime |
| **Lazy loading** | Pro plugin code is not downloaded until the server confirms the tier |

No single layer is sufficient on its own. All four work together.
