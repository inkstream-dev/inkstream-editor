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
