import { useState, useEffect } from 'react';
import { LicenseTier, validateLicense } from '@inkstream/editor-core';

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

/**
 * React hook that wraps the framework-agnostic `validateLicense` function from
 * `@inkstream/editor-core`, adding `isValidating` state for UI feedback.
 *
 * Security guarantees (enforced by `validateLicense`):
 * - Without validationEndpoint → always returns 'free'.
 * - Network failure → fails secure (returns 'free'), never fails open.
 * - Results are cached for 5 minutes inside `validateLicense`.
 */
export function useLicenseValidation({
  licenseKey,
  validationEndpoint,
}: UseLicenseValidationOptions): UseLicenseValidationResult {
  const [tier, setTier] = useState<LicenseTier>('free');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // SSR guard — skip network work before hydration.
    if (typeof window === 'undefined') {
      setTier('free');
      setIsValidating(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsValidating(true);

    validateLicense({ licenseKey, validationEndpoint }).then(result => {
      if (cancelled) return;
      setTier(result.tier);
      setError(result.error);
      setIsValidating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [licenseKey, validationEndpoint]);

  return { tier, isValidating, error };
}
