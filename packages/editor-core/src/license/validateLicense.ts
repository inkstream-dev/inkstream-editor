import { LicenseManager } from './LicenseManager';
import { LicenseTier, ServerValidationResponse } from './types';

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Module-level cache shared across all `validateLicense` calls in a session. */
const validationCache = new Map<string, { tier: LicenseTier; expiresAt: number }>();

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ValidateLicenseOptions {
  /** The license key to validate. */
  licenseKey?: string;
  /**
   * URL of your server-side license validation endpoint (POST).
   *
   * Expected request body: `{ licenseKey: string }`
   * Expected response: `ServerValidationResponse`
   *
   * **Security:** Without this, no paid tier is ever unlocked regardless of
   * the key value. This is intentional — the system is secure by default.
   */
  validationEndpoint?: string;
}

export interface ValidateLicenseResult {
  /**
   * The server-validated tier. Always `'free'` unless the server explicitly
   * returns a higher tier via a successful validation request.
   */
  tier: LicenseTier;
  /** Human-readable error message, or `null` when validation succeeded. */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Core validation function
// ---------------------------------------------------------------------------

/**
 * Validates a license key against a server endpoint and returns the
 * authoritative tier.
 *
 * Security guarantees (same as the React `useLicenseValidation` hook):
 * - No key provided → always `'free'`.
 * - Key fails format check → `'free'` with an error message (saves a round-trip).
 * - No `validationEndpoint` provided → always `'free'` (secure by default).
 * - Network or HTTP error → `'free'` (fail-secure, never fail-open).
 * - Valid server response with `isValid: true` → the tier from the response.
 * - Results are cached for 5 minutes keyed by license key string.
 *
 * This function requires the `fetch` API (available in Node 18+ and all
 * modern browsers). It has no React dependency and can be used in any
 * framework or plain JavaScript environment.
 *
 * @example
 * ```ts
 * const { tier, error } = await validateLicense({
 *   licenseKey: 'INKSTREAM-PRO-ABC123',
 *   validationEndpoint: '/api/validate-license',
 * });
 * // tier: 'pro' (if server confirms) | 'free' (if it doesn't)
 * ```
 */
export async function validateLicense(
  options: ValidateLicenseOptions,
): Promise<ValidateLicenseResult> {
  const { licenseKey, validationEndpoint } = options;

  // No key → free tier.
  if (!licenseKey) {
    return { tier: 'free', error: null };
  }

  // Client-side format check: avoids an unnecessary round-trip for clearly
  // invalid keys, but does NOT grant any tier access by itself.
  if (!LicenseManager.isValidKeyFormat(licenseKey)) {
    return { tier: 'free', error: 'Invalid license key format' };
  }

  // No endpoint → secure default: free tier.
  if (!validationEndpoint) {
    return { tier: 'free', error: null };
  }

  // Serve from cache if the entry is still fresh.
  const cached = validationCache.get(licenseKey);
  if (cached && Date.now() < cached.expiresAt) {
    return { tier: cached.tier, error: null };
  }

  // Server validation.
  try {
    const res = await fetch(validationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const result = (await res.json()) as ServerValidationResponse;

    if (result.isValid) {
      validationCache.set(licenseKey, {
        tier: result.tier,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return { tier: result.tier, error: null };
    }

    return { tier: 'free', error: result.reason ?? 'License validation failed' };
  } catch {
    // Fail-secure: never grant paid access on network errors.
    return {
      tier: 'free',
      error: 'Unable to reach license server. Continuing with free tier.',
    };
  }
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

/**
 * Clears the in-memory validation cache.
 *
 * - Pass a specific `licenseKey` to evict only that entry.
 * - Omit to clear the entire cache.
 *
 * Primarily useful in tests to avoid cache pollution between test cases.
 */
export function clearLicenseCache(licenseKey?: string): void {
  if (licenseKey) {
    validationCache.delete(licenseKey);
  } else {
    validationCache.clear();
  }
}
