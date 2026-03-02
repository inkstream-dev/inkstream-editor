# @inkstream/pro-plugins — Distribution Guide

## This is a private package

`@inkstream/pro-plugins` is **not published to the public npm registry**. Access is gated
behind a paid Inkstream license.

---

## Distribution Model: Private Registry + Runtime Guard

Protection is layered across two levels:

### Layer 1 — Private npm Registry (code access)

The package is published to a **private npm registry**. Only paying customers receive an
install token. Without the token, `npm install @inkstream/pro-plugins` fails at the
registry level — the code never reaches the developer's machine.

**Recommended registry options:**
- [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry) (simple for GitHub-hosted projects)
- [npm private packages](https://docs.npmjs.com/creating-and-publishing-private-packages)
- [Verdaccio](https://verdaccio.org/) (self-hosted)
- [JFrog Artifactory](https://jfrog.com/artifactory/)

**Customer setup:** After purchasing, customers receive a registry token. They add it to
their project's `.npmrc`:

```ini
# .npmrc (project root — do NOT commit this file)
@inkstream:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${INKSTREAM_NPM_TOKEN}
```

Then install normally:

```bash
npm install @inkstream/pro-plugins
```

### Layer 2 — Runtime Plugin Guard (activation)

Even if the package code is somehow obtained, **plugins are non-functional without a
server-validated tier**. All pro plugin instances must be created via the
`createProPlugins(validatedTier)` factory.

```ts
import { createProPlugins } from '@inkstream/pro-plugins';

// validatedTier comes from useLicenseValidation() — server-validated, not guessable
const { table, advancedExport } = createProPlugins(validatedTier);
```

If `validatedTier` does not satisfy the plugin's `requiredTier`, `createProPlugins` returns
**no-op stubs** — plugins that register no nodes, produce no toolbar items, and do nothing.
There is no way to bypass this without controlling the server that validates the license key.

**Do not use the `proPlugins` named export directly.** It is kept only for backward
compatibility and always returns no-op stubs.

---

## Security Properties

| Threat | Mitigated by |
|--------|--------------|
| Unauthorized npm install | Private registry (Layer 1) |
| Key format guessing | Server validation (Phase 1) |
| Direct import of plugin code | Runtime guard (Layer 2) |
| Network offline / server down | Fail secure → free tier |
| Forging `validatedTier` client-side | Server is source of truth (Phase 1) |

---

## Production Checklist

- [ ] Publish `@inkstream/pro-plugins` to your private npm registry
- [ ] Set `LICENSE_API_SECRET` env variable in your server (strong random string)
- [ ] Replace `VALID_LICENSE_KEYS` in `/api/validate-license/route.ts` with a database call
- [ ] Add rate limiting to `/api/validate-license`
- [ ] Set up customer onboarding to deliver npm tokens after purchase
- [ ] Rotate npm tokens periodically and on subscription cancellation
- [ ] Consider token scoping (read-only, scoped to `@inkstream`)

---

## What This Does NOT Protect Against

- A paying customer sharing their npm token with others (token revocation handles this)
- A customer reverse-engineering the activated plugin code at runtime (inherent to client-side JS)
- A determined attacker with both the npm token and a valid license (acceptable — they are a customer)

The goal is to make unauthorized access **economically impractical**, not cryptographically
impossible for client-side code.
