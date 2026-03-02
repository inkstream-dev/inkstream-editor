import { Plugin, LicenseTier, PluginTier, LicenseManager } from '@inkstream/editor-core';

/**
 * Wraps a pro/premium plugin with a tier guard.
 *
 * If the granted tier does not satisfy the plugin's required tier, this returns
 * a complete no-op stub — no schema nodes, no toolbar items, no ProseMirror
 * plugins, no keymaps. The plugin name and metadata are preserved so consumers
 * can still inspect what plugins were attempted.
 *
 * This is Layer 2 defense-in-depth. Even if someone obtains the package code
 * (bypassing the private registry), they cannot activate any pro feature without
 * a `grantedTier` that was issued by the server (via `useLicenseValidation`).
 *
 * @param plugin       The real plugin instance to protect.
 * @param requiredTier The minimum tier needed to activate this plugin.
 * @param grantedTier  The server-validated tier for the current user.
 */
export function guardPlugin(
  plugin: Plugin,
  requiredTier: PluginTier,
  grantedTier: LicenseTier
): Plugin {
  if (LicenseManager.canTierAccess(grantedTier, requiredTier)) {
    return plugin;
  }

  // Return a no-op stub. All capability methods return safe empty values.
  // Nodes/marks are omitted so they don't pollute the schema for free-tier users.
  return {
    name: plugin.name,
    tier: plugin.tier,
    description: plugin.description,
    getProseMirrorPlugins: () => [],
    getToolbarItems: () => [],
    getInputRules: () => [],
    getKeymap: () => ({}),
  };
}
