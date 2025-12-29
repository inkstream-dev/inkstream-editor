export * from './table';
export * from './ai-assistant';
export * from './advanced-export';

// Export all pro plugins in a convenient object
import { tablePlugin } from './table';
import { aiAssistantPlugin } from './ai-assistant';
import { advancedExportPlugin } from './advanced-export';

export const proPlugins = {
  table: tablePlugin,
  aiAssistant: aiAssistantPlugin,
  advancedExport: advancedExportPlugin,
};
