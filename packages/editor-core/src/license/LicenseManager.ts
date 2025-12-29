import { LicenseTier, LicenseKey, LicenseValidationResult, PluginTier } from './types';

/**
 * LicenseManager handles validation and tier checking for plugins
 */
export class LicenseManager {
  private licenseKey: LicenseKey | null = null;

  constructor(licenseKey?: string) {
    if (licenseKey) {
      this.setLicenseKey(licenseKey);
    }
  }

  /**
   * Set or update the license key
   */
  setLicenseKey(key: string): void {
    const validation = this.validateLicenseKey(key);
    if (validation.isValid) {
      this.licenseKey = {
        key,
        tier: validation.tier,
        expiresAt: validation.expiresAt,
        isValid: true,
      };
    } else {
      this.licenseKey = null;
    }
  }

  /**
   * Validate a license key and return the tier
   * In production, this would call your licensing API
   */
  private validateLicenseKey(key: string): LicenseValidationResult {
    // For demo purposes, we'll use a simple pattern:
    // Format: INKSTREAM-{TIER}-{RANDOM}
    // Example: INKSTREAM-PRO-ABC123, INKSTREAM-PREMIUM-XYZ789
    
    const pattern = /^INKSTREAM-(FREE|PRO|PREMIUM)-[A-Z0-9]+$/i;
    const match = key.match(pattern);

    if (!match) {
      return {
        isValid: false,
        tier: 'free',
        reason: 'Invalid license key format',
      };
    }

    const tier = match[1].toLowerCase() as LicenseTier;

    // In production, you would:
    // 1. Call your licensing API to validate the key
    // 2. Check expiration date
    // 3. Verify the key hasn't been revoked
    // 4. Check usage limits, etc.
    
    return {
      isValid: true,
      tier,
      expiresAt: undefined, // Would come from API
    };
  }

  /**
   * Get the current license tier
   */
  getTier(): LicenseTier {
    return this.licenseKey?.tier || 'free';
  }

  /**
   * Check if a plugin with given tier can be used
   */
  canUsePlugin(pluginTier: PluginTier): boolean {
    const currentTier = this.getTier();
    
    // Free tier can only use free plugins
    if (currentTier === 'free') {
      return pluginTier === 'free';
    }
    
    // Pro tier can use free and pro plugins
    if (currentTier === 'pro') {
      return pluginTier === 'free' || pluginTier === 'pro';
    }
    
    // Premium tier can use all plugins
    if (currentTier === 'premium') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if license is valid and not expired
   */
  isValid(): boolean {
    if (!this.licenseKey) {
      return true; // Free tier is always valid
    }

    if (!this.licenseKey.isValid) {
      return false;
    }

    // Check expiration
    if (this.licenseKey.expiresAt) {
      return new Date() < this.licenseKey.expiresAt;
    }

    return true;
  }

  /**
   * Get license information
   */
  getLicenseInfo(): LicenseKey | null {
    return this.licenseKey;
  }

  /**
   * Clear the current license (revert to free tier)
   */
  clearLicense(): void {
    this.licenseKey = null;
  }
}
