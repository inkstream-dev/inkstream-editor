# Lazy Loading Pro Plugins

This guide explains how to use the `useLazyPlugins` hook to code-split and lazy-load `@inkstream/pro-plugins` so that pro/premium plugin code is only downloaded when a user's license tier has been server-confirmed.

---

## Why lazy loading?

`@inkstream/pro-plugins` is a private package. Without lazy loading, bundlers would include the entire pro plugin bundle in the initial JavaScript payload regardless of whether the user holds a valid license. Lazy loading ensures:

- **Free tier users** never download pro plugin code
- **Pro/premium users** receive a small secondary chunk only after their tier is confirmed server-side
- The initial bundle remains lean for everyone

---

## `useLazyPlugins` hook

### Interface

```ts
type PluginLoader = (tier: LicenseTier) => Promise<{ default: Plugin } | { [key: string]: Plugin }>;

interface LazyPluginConfig {
  /** Dynamic import function. Receives the server-validated tier as its first argument. */
  loader: PluginLoader;
  /** Minimum tier required to load this plugin. */
  requiredTier: 'pro' | 'premium';
  /** Key in the module's named exports to extract the plugin from. */
  pluginKey?: string;
}

interface UseLazyPluginsOptions {
  /** The server-validated tier returned by useLicenseValidation. Defaults to 'free'. */
  validatedTier?: LicenseTier;
  lazyPlugins?: LazyPluginConfig[];
}

interface UseLazyPluginsResult {
  /** Array of successfully loaded Plugin instances. Empty until plugins are loaded. */
  loadedPlugins: Plugin[];
  /** True while plugins are being fetched. */
  isLoading: boolean;
  /** Set if any plugin failed to load; null otherwise. */
  error: Error | null;
}
```

The `loader` function receives `tier` as its first argument. Always forward it to `createProPlugins(tier)` — this is how `guardPlugin()` inside the package enforces server-validated access at runtime.

---

## `useLicenseValidation` hook

Use this hook to validate a license key against your server before loading pro plugins.

```ts
interface UseLicenseValidationOptions {
  licenseKey?: string;
  /** URL of your POST /api/validate-license endpoint. */
  validationEndpoint?: string;
}

interface UseLicenseValidationResult {
  /** Server-validated tier. Always 'free' until the server confirms otherwise. */
  tier: LicenseTier;
  /** True while a validation request is in-flight. */
  isValidating: boolean;
  /** Human-readable error message, or null on success. */
  error: string | null;
}
```

**Security guarantees:**
- Without `validationEndpoint` → always returns `'free'`, regardless of key value
- Network failure → fails secure (returns `'free'`), never fails open
- Client-side key format check is for UX feedback only and does not grant access

---

## Full example

```tsx
import { RichTextEditor, useLazyPlugins, useLicenseValidation } from '@inkstream/react-editor';
import { availablePlugins } from '@inkstream/editor-core';

interface MyEditorProps {
  licenseKey: string;
}

export default function MyEditor({ licenseKey }: MyEditorProps) {
  // Step 1 — Validate the license server-side
  const { tier, isValidating } = useLicenseValidation({
    licenseKey,
    validationEndpoint: '/api/validate-license',
  });

  // Step 2 — Lazy-load pro plugins based on confirmed tier
  const { loadedPlugins, isLoading, error } = useLazyPlugins({
    validatedTier: tier,
    lazyPlugins: [
      // Pro tier plugins
      {
        loader: (t) =>
          import('@inkstream/pro-plugins').then(m => ({
            table: m.createProPlugins(t).table,
          })),
        requiredTier: 'pro',
        pluginKey: 'table',
      },
      {
        loader: (t) =>
          import('@inkstream/pro-plugins').then(m => ({
            advancedExport: m.createProPlugins(t).advancedExport,
          })),
        requiredTier: 'pro',
        pluginKey: 'advancedExport',
      },
      // Premium tier plugins
      {
        loader: (t) =>
          import('@inkstream/pro-plugins').then(m => ({
            aiAssistant: m.createProPlugins(t).aiAssistant,
          })),
        requiredTier: 'premium',
        pluginKey: 'aiAssistant',
      },
    ],
  });

  // Step 3 — Merge free and pro plugins
  const plugins = [...Object.values(availablePlugins), ...loadedPlugins];

  return (
    <>
      {(isValidating || isLoading) && <p>Loading editor features…</p>}
      {error && <p>Failed to load pro plugins: {error.message}</p>}
      <RichTextEditor
        plugins={plugins}
        licenseKey={licenseKey}
        licenseValidationEndpoint="/api/validate-license"
      />
    </>
  );
}
```

---

## Loading states

| State | Description |
|-------|-------------|
| `isLoading: true` | Plugins are currently being fetched (dynamic import in-flight) |
| `isLoading: false, loadedPlugins: []` | Free tier or validation pending — no pro plugins loaded |
| `isLoading: false, loadedPlugins: [...]` | Plugins loaded and ready |
| `error` | A plugin failed to load; editor falls back to free features only |

---

## Notes

- `useLazyPlugins` re-runs whenever `validatedTier` changes. If a user upgrades mid-session, plugins reload automatically.
- Pass `validatedTier` from `useLicenseValidation`, not a raw `licenseKey`. The deprecated `licenseKey` option on `useLazyPlugins` always resolves to `'free'` — it exists only for backward compatibility.
- Each `LazyPluginConfig` is loaded in parallel via `Promise.all`. A single failed loader sets `error` but does not prevent other plugins from being returned.
