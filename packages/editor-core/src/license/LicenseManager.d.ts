import { LicenseTier, LicenseKey, PluginTier } from './types';
/**
 * LicenseManager handles validation and tier checking for plugins
 */
export declare class LicenseManager {
    private licenseKey;
    constructor(licenseKey?: string);
    /**
     * Set or update the license key
     */
    setLicenseKey(key: string): void;
    /**
     * Validate a license key and return the tier
     * In production, this would call your licensing API
     */
    private validateLicenseKey;
    /**
     * Get the current license tier
     */
    getTier(): LicenseTier;
    /**
     * Check if a plugin with given tier can be used
     */
    canUsePlugin(pluginTier: PluginTier): boolean;
    /**
     * Check if license is valid and not expired
     */
    isValid(): boolean;
    /**
     * Get license information
     */
    getLicenseInfo(): LicenseKey | null;
    /**
     * Clear the current license (revert to free tier)
     */
    clearLicense(): void;
}
