/**
 * User license tiers available in Inkstream
 */
export type LicenseTier = 'free' | 'pro' | 'premium';

/**
 * Plugin tier - determines which license is required to use this plugin
 */
export type PluginTier = 'free' | 'pro' | 'premium';

/**
 * License key information
 */
export interface LicenseKey {
  key: string;
  tier: LicenseTier;
  expiresAt?: Date;
  isValid: boolean;
}

/**
 * License validation result
 */
export interface LicenseValidationResult {
  isValid: boolean;
  tier: LicenseTier;
  reason?: string;
  expiresAt?: Date;
}

/**
 * Response shape returned by the server-side license validation endpoint.
 * The client trusts this response as the authoritative tier source.
 */
export interface ServerValidationResponse {
  isValid: boolean;
  tier: LicenseTier;
  expiresAt?: string | null;
  reason?: string;
}
