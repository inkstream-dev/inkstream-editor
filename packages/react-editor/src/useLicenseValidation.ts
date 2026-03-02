import { useState, useEffect } from 'react';
import { LicenseTier, LicenseManager, ServerValidationResponse } from '@inkstream/editor-core';

export interface UseLicenseValidationOptions {
  licenseKey?: string;
  /**
   * URL of your server-side license validation endpoint (POST).
   * Expected request body: { licenseKey: string }
   * Expected response: ServerValidationResponse
   *
   * SECURITY: If this is not provided, no paid tier is ever unlocked regardless
   * of the license key value. Features must be gated server-side.
   */
  validationEndpoint?: string;
}

export interface UseLicenseValidationResult {
  /** The server-validated tier. Always 'free' until server confirms otherwise. */
  tier: LicenseTier;
  /** True while a server validation request is in-flight. */
  isValidating: boolean;
  /** Human-readable error message, or null when validation succeeded. */
  error: string | null;
}

// Module-level cache shared across all instances.
// Key: licenseKey, Value: { tier, expiresAt (ms timestamp) }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const validationCache = new Map<string, { tier: LicenseTier; expiresAt: number }>();

/**
 * Validates a license key against a server endpoint and returns the authoritative
 * tier. Falls back to 'free' on network errors or when no endpoint is provided.
 *
 * Security guarantees:
 * - Without validationEndpoint → always returns 'free'.
 * - With validationEndpoint → trusts only the server response, never the key format.
 * - Network failure → fails secure (returns 'free'), never fails open.
 */
export function useLicenseValidation({
  licenseKey,
  validationEndpoint,
}: UseLicenseValidationOptions): UseLicenseValidationResult {
  const [tier, setTier] = useState<LicenseTier>('free');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No key — stay on free tier
    if (!licenseKey) {
      setTier('free');
      setError(null);
      return;
    }

    // Client-side format check for instant UX feedback only.
    // This does NOT grant access — it only avoids an unnecessary round-trip.
    if (!LicenseManager.isValidKeyFormat(licenseKey)) {
      setTier('free');
      setError('Invalid license key format');
      return;
    }

    // No endpoint configured → secure default: free tier.
    // We will never unlock paid features based on the key string alone.
    if (!validationEndpoint) {
      setTier('free');
      setError(null);
      return;
    }

    // Serve from cache if still fresh
    const cached = validationCache.get(licenseKey);
    if (cached && Date.now() < cached.expiresAt) {
      setTier(cached.tier);
      setError(null);
      return;
    }

    // Server validation
    let cancelled = false;
    setIsValidating(true);
    setError(null);

    fetch(validationEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ServerValidationResponse>;
      })
      .then(result => {
        if (cancelled) return;
        if (result.isValid) {
          validationCache.set(licenseKey, {
            tier: result.tier,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          setTier(result.tier);
          setError(null);
        } else {
          setTier('free');
          setError(result.reason ?? 'License validation failed');
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Fail secure — do not grant paid access on network errors
        setTier('free');
        setError('Unable to reach license server. Continuing with free tier.');
      })
      .finally(() => {
        if (!cancelled) setIsValidating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [licenseKey, validationEndpoint]);

  return { tier, isValidating, error };
}
