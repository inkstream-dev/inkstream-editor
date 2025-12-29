import { useState, useEffect, useRef } from 'react';
import { Plugin } from '@inkstream/editor-core';

type PluginLoader = () => Promise<{ default: Plugin } | { [key: string]: Plugin }>;

interface LazyPluginConfig {
  loader: PluginLoader;
  requiredTier: 'pro' | 'premium';
  pluginKey?: string; // Key in the module exports if not default export
}

interface UseLazyPluginsOptions {
  licenseKey?: string;
  lazyPlugins?: LazyPluginConfig[];
}

interface UseLazyPluginsResult {
  loadedPlugins: Plugin[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to lazy load plugins based on license tier
 * This enables code splitting - pro plugin code is only loaded when needed
 */
export function useLazyPlugins(options: UseLazyPluginsOptions): UseLazyPluginsResult {
  const { licenseKey = '', lazyPlugins = [] } = options;
  const [loadedPlugins, setLoadedPlugins] = useState<Plugin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedTierRef = useRef<string>(''); // Track last loaded tier to prevent re-loading

  // Determine tier from license key
  const getTier = (key: string): 'free' | 'pro' | 'premium' => {
    if (key.startsWith('INKSTREAM-PREMIUM-')) {
      return 'premium';
    } else if (key.startsWith('INKSTREAM-PRO-')) {
      return 'pro';
    }
    return 'free';
  };

  const canLoadTier = (requiredTier: 'pro' | 'premium', currentTier: 'free' | 'pro' | 'premium'): boolean => {
    if (requiredTier === 'pro') {
      return currentTier === 'pro' || currentTier === 'premium';
    }
    if (requiredTier === 'premium') {
      return currentTier === 'premium';
    }
    return true;
  };

  useEffect(() => {
    const loadPlugins = async () => {
      const currentTier = getTier(licenseKey);
      
      // Skip if we already loaded plugins for this tier
      if (loadedTierRef.current === currentTier) {
        return;
      }
      
      // Filter plugins that should be loaded for current tier
      const pluginsToLoad = lazyPlugins.filter(config => 
        canLoadTier(config.requiredTier, currentTier)
      );

      if (pluginsToLoad.length === 0) {
        setLoadedPlugins([]);
        loadedTierRef.current = currentTier;
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log(`[useLazyPlugins] Loading ${pluginsToLoad.length} plugins for tier: ${currentTier}`);
        
        // Load all plugins in parallel
        const results = await Promise.all(
          pluginsToLoad.map(async (config) => {
            try {
              const module = await config.loader();
              
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

        console.log(`[useLazyPlugins] Successfully loaded ${results.length} plugins`);
        setLoadedPlugins(results);
        loadedTierRef.current = currentTier; // Mark this tier as loaded
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
  }, [licenseKey]); // Only depend on licenseKey, not lazyPlugins array

  return { loadedPlugins, isLoading, error };
}
