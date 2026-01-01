import React, { useState, useCallback, useEffect } from 'react';
import { RichTextEditor } from './index';
import { TableInsertDialog } from './TableInsertDialog';

// Global registry for table dialog handler
// This will be set by whoever loads the pro-plugins
if (typeof window !== 'undefined') {
  (window as any).__inkstreamTableDialogRegistry__ = {
    setHandler: null as ((handler: () => void) => void) | null,
    insertTable: null as any,
  };
}

export interface EditorWithTableDialogProps {
  initialContent: string;
  plugins?: any[];
  pluginOptions?: { [key: string]: any };
  toolbarLayout?: string[];
  licenseKey?: string;
  onLicenseError?: (plugin: any, tier: string) => void;
}

export const EditorWithTableDialog: React.FC<EditorWithTableDialogProps> = (props) => {
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);

  // Set up the table dialog handler on mount and when plugins change
  useEffect(() => {
    const setupHandler = () => {
      const registry = (window as any).__inkstreamTableDialogRegistry__;
      console.log('[EDITOR WITH DIALOG] Setting up dialog handler');
      console.log('[EDITOR WITH DIALOG] Registry:', registry);
      
      if (registry && registry.setHandler && typeof registry.setHandler === 'function') {
        console.log('[EDITOR WITH DIALOG] Registering dialog handler');
        registry.setHandler(() => {
          console.log('[EDITOR WITH DIALOG] Dialog handler called!');
          setIsTableDialogOpen(true);
        });
        return true;
      }
      return false;
    };

    // Try to setup immediately
    if (setupHandler()) {
      console.log('[EDITOR WITH DIALOG] Handler setup successful');
      return;
    }

    // If not available, retry periodically
    console.log('[EDITOR WITH DIALOG] Registry not available yet, will retry');
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      console.log(`[EDITOR WITH DIALOG] Retry attempt ${attempts}/${maxAttempts}`);
      if (setupHandler()) {
        console.log('[EDITOR WITH DIALOG] Handler setup successful on retry');
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        console.warn('[EDITOR WITH DIALOG] Failed to setup handler after', maxAttempts, 'attempts');
        clearInterval(interval);
      }
    }, 200);

    return () => {
      console.log('[EDITOR WITH DIALOG] Cleanup - removing handler');
      clearInterval(interval);
      const registry = (window as any).__inkstreamTableDialogRegistry__;
      if (registry && registry.setHandler) {
        registry.setHandler(null);
      }
    };
  }, [props.plugins]); // Re-run when plugins change

  const handleInsertTable = useCallback((config: { rows: number; cols: number; withHeaderRow: boolean }) => {
    console.log('[EDITOR WITH DIALOG] Inserting table:', config);
    const registry = (window as any).__inkstreamTableDialogRegistry__;
    const view = (window as any).__inkstreamEditorView__;
    
    if (view && registry && registry.insertTable) {
      console.log('[EDITOR WITH DIALOG] Executing insertTable command');
      const command = registry.insertTable(config.rows, config.cols, config.withHeaderRow);
      command(view.state, view.dispatch, view);
    } else {
      console.error('[EDITOR WITH DIALOG] Cannot insert table - missing view or insertTable function');
    }
    
    setIsTableDialogOpen(false);
  }, []);

  return (
    <>
      <RichTextEditor {...props} />
      <TableInsertDialog
        isOpen={isTableDialogOpen}
        onClose={() => setIsTableDialogOpen(false)}
        onInsert={handleInsertTable}
      />
    </>
  );
};
