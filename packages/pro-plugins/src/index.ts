export * from './table/index';
export * from './ai-assistant';
export * from './advanced-export';
export { guardPlugin } from './pluginGuard';

import { LicenseTier } from '@inkstream/editor-core';
import { tablePlugin } from './table/index';
import { aiAssistantPlugin } from './ai-assistant';
import { advancedExportPlugin } from './advanced-export';
import { guardPlugin } from './pluginGuard';

/**
 * Creates guarded instances of all pro/premium plugins for the given
 * server-validated tier.
 *
 * Plugins whose required tier exceeds `grantedTier` are replaced with no-op
 * stubs — they register nothing in the schema and add no toolbar items.
 *
 * Always use this factory. Never import `proPlugins` directly.
 *
 * @param grantedTier The tier returned by `useLicenseValidation` — server-validated.
 */
export function createProPlugins(grantedTier: LicenseTier) {
  return {
    table: guardPlugin(tablePlugin, 'pro', grantedTier),
    advancedExport: guardPlugin(advancedExportPlugin, 'pro', grantedTier),
    aiAssistant: guardPlugin(aiAssistantPlugin, 'premium', grantedTier),
  };
}

/**
 * @deprecated Use `createProPlugins(validatedTier)` instead.
 *
 * This export is kept only for backward compatibility. All plugins here are
 * permanently guarded with 'free' tier — they are no-op stubs and will never
 * activate. Migrate to `createProPlugins` to enable pro features.
 */
export const proPlugins = {
  table: guardPlugin(tablePlugin, 'pro', 'free'),
  advancedExport: guardPlugin(advancedExportPlugin, 'pro', 'free'),
  aiAssistant: guardPlugin(aiAssistantPlugin, 'premium', 'free'),
};

