"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { EditorView } from '@inkstream/pm/view';
import { InkstreamEditor, Plugin, ToolbarItem, LicenseManager, ChainedCommands, CommandChain, EditorStateStore } from '@inkstream/editor-core';
import { availablePlugins } from '@inkstream/starter-kit';
import { getLinkBubbleToolbarItem } from '@inkstream/link-bubble';
import { Toolbar } from './Toolbar';
import './editor.css';
import { imagePluginWithNodeView } from './imagePluginWithNodeView';
import { useLicenseValidation } from './useLicenseValidation';

// Stable module-level defaults to prevent new object/array references on
// every render, which would cause useEffect to re-run infinitely.
// The image plugin is replaced with its React-enhanced variant so that the
// drag-and-drop upload UI is available without any extra configuration.
const DEFAULT_PLUGINS = Object.values(availablePlugins).map(p =>
  p.name === 'image' ? imagePluginWithNodeView : p
);
const DEFAULT_PLUGIN_OPTIONS: { [key: string]: Record<string, unknown> } = {};
const DEFAULT_TOOLBAR_LAYOUT: string[] = [];

/** Controls which colour scheme the editor uses. */
export type ThemeMode = 'auto' | 'light' | 'dark';

/**
 * Ref handle returned by `<RichTextEditor ref={...} />`.
 *
 * Provides programmatic access to the editor's command API:
 *
 * ```tsx
 * const editorRef = useRef<EditorRef>(null);
 *
 * // Execute commands
 * editorRef.current?.chain().toggleBold().focus().run();
 *
 * // Dry-run check (no state mutation)
 * const canBold = editorRef.current?.can().toggleBold().run();
 * ```
 */
export interface EditorRef {
  /**
   * Build a chainable command chain. Commands are executed sequentially
   * when `.run()` is called.
   */
  chain(): ChainedCommands;
  /**
   * Build a dry-run chain. Commands test feasibility (dispatch is undefined)
   * and never mutate editor state. Returns `true` if all commands would succeed.
   */
  can(): ChainedCommands;
  /** Direct access to the live EditorView, or `null` before the editor mounts. */
  getView(): EditorView | null;
  /** Returns the current document serialised as an HTML string. */
  getContent(): string;
}

interface RichTextEditorProps {
  initialContent: string;
  plugins?: Plugin[];  // Now accepts Plugin instances instead of string IDs
  pluginOptions?: { [key: string]: Record<string, unknown> };
  toolbarLayout?: string[];
  licenseKey?: string;
  /**
   * URL of your server-side license validation endpoint.
   * Without this, the editor only ever uses free-tier plugins regardless of licenseKey.
   */
  licenseValidationEndpoint?: string;
  onLicenseError?: (plugin: Plugin, tier: string) => void; // Callback when a plugin requires a higher tier
  /** Called with the EditorView instance once the editor is ready. */
  onEditorReady?: (view: EditorView) => void;
  /**
   * Called whenever the document content changes.
   * Receives the current content serialized as an HTML string.
   */
  onChange?: (html: string) => void;
  /**
   * Controls the colour scheme: 'auto' follows the OS, 'light' forces light,
   * 'dark' forces dark. Defaults to 'auto'.
   *
   * Pass this prop to control theme from outside. Omit it (with showThemeToggle)
   * to let users switch the theme through the built-in toolbar toggle.
   */
  theme?: ThemeMode;
  /**
   * When true, adds a theme-toggle button to the right end of the toolbar so
   * users can switch between Auto / Light / Dark without any extra wiring.
   */
  showThemeToggle?: boolean;
  /** Called whenever the theme changes (both via the built-in toggle and via prop). */
  onThemeChange?: (theme: ThemeMode) => void;
  /**
   * Controls whether the editor renders its initial output immediately (default)
   * or defers to the first client-side effect.
   *
   * Set to `false` when rendering inside an SSR / Next.js App Router environment
   * to prevent hydration mismatches. The server and the initial client paint will
   * both output an empty wrapper `<div>`; the full editor mounts only after the
   * component's `useEffect` fires on the client.
   *
   * ```tsx
   * // Next.js App Router — safe SSR usage
   * <RichTextEditor immediatelyRender={false} initialContent={html} />
   * ```
   *
   * Defaults to `true` for backward compatibility. In a pure client-only app
   * (no SSR) the default is always safe.
   */
  immediatelyRender?: boolean;
}

export const RichTextEditor = forwardRef<EditorRef, RichTextEditorProps>(function RichTextEditor({ 
  initialContent, 
  plugins = DEFAULT_PLUGINS,
  pluginOptions = DEFAULT_PLUGIN_OPTIONS,
  toolbarLayout = DEFAULT_TOOLBAR_LAYOUT,
  licenseKey,
  licenseValidationEndpoint,
  onLicenseError,
  onEditorReady,
  onChange,
  theme,
  showThemeToggle = false,
  onThemeChange,
  immediatelyRender = true,
}, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<InkstreamEditor | null>(null);
  // Per-transaction notification store — toolbar buttons subscribe to this
  // instead of receiving editorState as a React prop on every keystroke.
  const storeRef = useRef<EditorStateStore | null>(null);
  // React state for the EditorView instance — triggers re-render once on mount/unmount
  // so that the Toolbar receives a non-null editorView prop after initialization.
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  type ToolbarItemOrSeparator = ToolbarItem | string;

  const [toolbarItems, setToolbarItems] = useState<ToolbarItemOrSeparator[]>([]);

  // Theme state — uncontrolled when `theme` prop is not provided; syncs when it is.
  const [internalTheme, setInternalTheme] = useState<ThemeMode>(theme ?? 'auto');

  // Sync controlled theme prop → internal state
  useEffect(() => {
    if (theme !== undefined) setInternalTheme(theme);
  }, [theme]);

  // SSR safety: when immediatelyRender=false, skip the first render so that
  // the server HTML (empty wrapper) and the first client paint match exactly.
  // After this effect fires (client-side only) the full editor mounts.
  const [isMounted, setIsMounted] = useState(immediatelyRender);
  useEffect(() => {
    if (!immediatelyRender) setIsMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleThemeChange = useCallback((next: ThemeMode) => {
    setInternalTheme(next);
    onThemeChange?.(next);
  }, [onThemeChange]);

  const wrapperClass = [
    'inkstream-editor-wrapper',
    internalTheme === 'dark' ? 'inkstream-dark' : '',
    internalTheme === 'light' ? 'inkstream-light' : '',
  ].filter(Boolean).join(' ');
  
  // Server-validated tier. Always 'free' until the validation endpoint confirms otherwise.
  const { tier: validatedTier } = useLicenseValidation({ licenseKey, validationEndpoint: licenseValidationEndpoint });
  
  // Filter plugins based on server-validated tier only
  const validatedPlugins = useMemo(() => {
    return plugins.filter(plugin => {
      const pluginTier = plugin.tier || 'free';
      const canUse = LicenseManager.canTierAccess(validatedTier, pluginTier);
      
      if (!canUse) {
        console.warn(`Plugin "${plugin.name}" requires ${pluginTier} tier but user has ${validatedTier} tier`);
        if (onLicenseError) {
          onLicenseError(plugin, pluginTier);
        }
        return false;
      }
      
      return true;
    });
  }, [plugins, validatedTier, onLicenseError]);

  // Keep refs so callbacks are never stale without appearing in effect dep arrays.
  // This prevents: prop change → new callback identity → effect re-run → editor destroyed.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  const onEditorReadyRef = useRef(onEditorReady);
  useEffect(() => { onEditorReadyRef.current = onEditorReady; });

  // Effect 1 — InkstreamEditor lifecycle.
  // Creates and destroys the headless editor instance.
  // Depends ONLY on what actually requires a new editor: plugins and initial content.
  // toolbarLayout / pluginOptions / onChange changes do NOT belong here.
  useEffect(() => {
    if (!editorRef.current) return;
    if (typeof window === 'undefined') return;

    const editor = new InkstreamEditor({
      element: editorRef.current,
      plugins: validatedPlugins,
      initialContent,
      onChange: onChangeRef.current,
      onReady: (view) => onEditorReadyRef.current?.(view),
    });

    editorInstanceRef.current = editor;
    storeRef.current = editor.store;
    setEditorView(editor.getView());

    return () => {
      editor.destroy();
      editorInstanceRef.current = null;
      storeRef.current = null;
      setEditorView(null);
    };
  }, [validatedPlugins, initialContent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2 — Keep onChange in sync without recreating the editor.
  useEffect(() => {
    editorInstanceRef.current?.updateCallbacks({ onChange });
  }, [onChange]);

  // Effect 3 — Toolbar construction.
  // Builds toolbar items and applies toolbarLayout ordering.
  // Runs when the editor mounts (editorView changes) or pluginOptions/layout change.
  useEffect(() => {
    const editor = editorInstanceRef.current;
    if (!editor) return;

    const allToolbarItems = editor.getToolbarItems(pluginOptions);
    allToolbarItems.set('link', getLinkBubbleToolbarItem(editor.schema));
    let orderedToolbarItems: ToolbarItemOrSeparator[] = [];

    if (toolbarLayout && toolbarLayout.length > 0) {
      for (const itemId of toolbarLayout) {
        if (itemId === '|') {
          orderedToolbarItems.push(itemId);
        } else {
          const item = allToolbarItems.get(itemId);
          if (item) {
            orderedToolbarItems.push(item);
          }
        }
      }
    } else {
      orderedToolbarItems = Array.from(allToolbarItems.values());
    }

    setToolbarItems(orderedToolbarItems);
  }, [editorView, pluginOptions, toolbarLayout]);

  // Expose chain() / can() / getView() / getContent() on the forwarded ref.
  useImperativeHandle(ref, () => ({
    chain(): ChainedCommands {
      if (editorInstanceRef.current) return editorInstanceRef.current.chain();
      return new CommandChain(() => null, {}, false) as ChainedCommands;
    },
    can(): ChainedCommands {
      if (editorInstanceRef.current) return editorInstanceRef.current.can();
      return new CommandChain(() => null, {}, true) as ChainedCommands;
    },
    getView(): EditorView | null {
      return editorInstanceRef.current?.getView() ?? null;
    },
    getContent(): string {
      return editorInstanceRef.current?.getContent() ?? '';
    },
  }), [editorView]);

  // When deferred rendering is requested, show only the wrapper shell until
  // the client-side effect above flips isMounted → true.
  if (!isMounted) {
    return <div className={wrapperClass} />;
  }

  return (
    <div className={wrapperClass}>
      <Toolbar
        store={storeRef.current}
        editorView={editorView}
        toolbarItems={toolbarItems}
        themeMode={showThemeToggle ? internalTheme : undefined}
        onThemeChange={showThemeToggle ? handleThemeChange : undefined}
      />
      <div ref={editorRef} className="inkstream-editor" />
    </div>
  );
});

export * from './EditorWithTableDialog';
export { TablePropertiesDialog } from './TablePropertiesDialog';
export type { } from './TablePropertiesDialog';
export { useLazyPlugins } from './useLazyPlugins';
export { useLicenseValidation } from './useLicenseValidation';
export type { UseLicenseValidationOptions, UseLicenseValidationResult } from './useLicenseValidation';
export { useEditorState, EditorStateStore } from './useEditorState';
export { ReactNodeViewRenderer } from './ReactNodeViewRenderer';
export type { NodeViewComponentProps, ReactNodeViewRendererOptions } from './ReactNodeViewRenderer';
export { imagePluginWithNodeView } from './imagePluginWithNodeView';
