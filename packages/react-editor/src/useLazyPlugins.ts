import { useState, useEffect, useRef } from 'react';
import { Plugin, LicenseTier, LicenseManager } from '@inkstream/editor-core';

/**
 * A plugin loader function that receives the server-validated tier so it can
 * call `createProPlugins(tier)` and return a properly guarded plugin instance.
 *
 * The tier is passed by `useLazyPlugins` — consumers should forward it to
 * `createProPlugins` inside their loader:
 *
 * @example
 * ```ts
 * loader: (tier) => import('@inkstream-dev/pro-plugins')
 *   .then(m => ({ table: m.createProPlugins(tier).table }))
 * ```
 */
type PluginLoader = (tier: LicenseTier) => Promise<{ default: Plugin } | { [key: string]: Plugin }>;

interface LazyPluginConfig {
  loader: PluginLoader;
  requiredTier: 'pro' | 'premium';
  pluginKey?: string; // Key in the module exports if not default export
}

interface UseLazyPluginsOptions {
  /**
   * The server-validated tier returned by `useLicenseValidation`.
   * This is the authoritative source for which plugins to load.
   * If not provided, defaults to 'free' — no paid plugins will load.
   */
  validatedTier?: LicenseTier;
  /**
   * @deprecated Pass `validatedTier` from `useLicenseValidation` instead.
   * Kept for backward compatibility only. Has no effect on tier resolution.
   */
  licenseKey?: string;
  lazyPlugins?: LazyPluginConfig[];
}

interface UseLazyPluginsResult {
  loadedPlugins: Plugin[];
  isLoading: boolean;
  error: Error | null;
}

const canLoadTier = (requiredTier: 'pro' | 'premium', currentTier: LicenseTier): boolean =>
  LicenseManager.canTierAccess(currentTier, requiredTier);

/**
 * Lazy-loads plugins based on a server-validated tier.
 * Pro plugin code is only downloaded when the server has confirmed the license.
 */
export function useLazyPlugins(options: UseLazyPluginsOptions): UseLazyPluginsResult {
  // Use server-validated tier only. Default to 'free' — no bypass via licenseKey format.
  const effectiveTier: LicenseTier = options.validatedTier ?? 'free';
  const lazyPlugins = options.lazyPlugins ?? [];

  const [loadedPlugins, setLoadedPlugins] = useState<Plugin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedTierRef = useRef<string>(''); // Track last loaded tier to prevent re-loading

  useEffect(() => {
    const loadPlugins = async () => {
      // Skip if we already loaded plugins for this tier
      if (loadedTierRef.current === effectiveTier) {
        return;
      }
      
      // Filter plugins that should be loaded for current tier
      const pluginsToLoad = lazyPlugins.filter(config => 
        canLoadTier(config.requiredTier, effectiveTier)
      );

      if (pluginsToLoad.length === 0) {
        setLoadedPlugins([]);
        loadedTierRef.current = effectiveTier;
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Load all plugins in parallel
        const results = await Promise.all(
          pluginsToLoad.map(async (config) => {
            try {
              // Pass the validated tier so the loader can call createProPlugins(tier)
              const module = await config.loader(effectiveTier);
              
              // Handle default export or named export
              if ('default' in module) {
                return module.default;
              } else if (config.pluginKey && config.pluginKey in module) {
                return module[config.pluginKey];
              } else {
                // Try to find the first Plugin export
                const firstPlugin = Object.values(module).find(
                  (value): value is Plugin => 
                    typeof value === 'object' && value !== null && 'name' in value
                );
                if (firstPlugin) {
                  return firstPlugin;
                }
              }
              
              throw new Error('Could not find plugin in module');
            } catch (err) {
              console.error(`[useLazyPlugins] Failed to load plugin:`, err);
              throw err;
            }
          })
        );

        setLoadedPlugins(results);
        loadedTierRef.current = effectiveTier;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load plugins');
        console.error('[useLazyPlugins] Error loading plugins:', error);
        setError(error);
        setLoadedPlugins([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlugins();
  }, [effectiveTier, lazyPlugins]); // Depend on server-validated tier and plugin config

  return { loadedPlugins, isLoading, error };
}
