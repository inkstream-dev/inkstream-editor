"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseManager = void 0;
/**
 * LicenseManager handles validation and tier checking for plugins
 */
class LicenseManager {
    constructor(licenseKey) {
        this.licenseKey = null;
        if (licenseKey) {
            this.setLicenseKey(licenseKey);
        }
    }
    /**
     * Checks whether a license key matches the expected format.
     * CLIENT-SIDE UX check only — never use to grant paid feature access.
     */
    static isValidKeyFormat(key) {
        return /^INKSTREAM-(FREE|PRO|PREMIUM)-[A-Z0-9]+$/i.test(key);
    }
    /**
     * Pure tier-access check using a server-validated tier.
     */
    static canTierAccess(userTier, requiredTier) {
        if (userTier === 'premium') return true;
        if (userTier === 'pro') return requiredTier === 'free' || requiredTier === 'pro';
        return requiredTier === 'free';
    }
    /**
     * Set or update the license key
     */
    setLicenseKey(key) {
        const validation = this.validateLicenseKey(key);
        if (validation.isValid) {
            this.licenseKey = {
                key,
                tier: validation.tier,
                expiresAt: validation.expiresAt,
                isValid: true,
            };
        }
        else {
            this.licenseKey = null;
        }
    }
    /**
     * Validate a license key and return the tier
     * In production, this would call your licensing API
     */
    validateLicenseKey(key) {
        const pattern = /^INKSTREAM-(FREE|PRO|PREMIUM)-[A-Z0-9]+$/i;
        const match = key.match(pattern);
        if (!match) {
            return {
                isValid: false,
                tier: 'free',
                reason: 'Invalid license key format',
            };
        }
        const tier = match[1].toLowerCase();
        return {
            isValid: true,
            tier,
            expiresAt: undefined,
        };
    }
    /**
     * Get the current license tier
     */
    getTier() {
        return this.licenseKey?.tier || 'free';
    }
    /**
     * Check if a plugin with given tier can be used
     */
    canUsePlugin(pluginTier) {
        const currentTier = this.getTier();
        if (currentTier === 'free') {
            return pluginTier === 'free';
        }
        if (currentTier === 'pro') {
            return pluginTier === 'free' || pluginTier === 'pro';
        }
        if (currentTier === 'premium') {
            return true;
        }
        return false;
    }
    /**
     * Check if license is valid and not expired
     */
    isValid() {
        if (!this.licenseKey) {
            return true;
        }
        if (!this.licenseKey.isValid) {
            return false;
        }
        if (this.licenseKey.expiresAt) {
            return new Date() < this.licenseKey.expiresAt;
        }
        return true;
    }
    /**
     * Get license information
     */
    getLicenseInfo() {
        return this.licenseKey;
    }
    /**
     * Clear the current license (revert to free tier)
     */
    clearLicense() {
        this.licenseKey = null;
    }
}
exports.LicenseManager = LicenseManager;
