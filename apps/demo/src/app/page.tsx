"use client";

import { EditorWithTableDialog, useLazyPlugins, useLicenseValidation } from "@inkstream/react-editor";
import { availablePlugins, Plugin } from "@inkstream/editor-core";
import { headingPlugin } from "@inkstream/heading";
import { linkBubbleWrapperPlugin } from "@inkstream/link-bubble";
import { useState, useMemo, useEffect } from "react";

const VALIDATION_ENDPOINT = "/api/validate-license";

export default function Home() {
  const [licenseKey, setLicenseKey] = useState<string>("INKSTREAM-PRO-ABC123");

  const { tier: validatedTier, isValidating, error: licenseError } = useLicenseValidation({
    licenseKey,
    validationEndpoint: VALIDATION_ENDPOINT,
  });

  // Inject table styles once on mount
  useEffect(() => {
    import("@inkstream-dev/pro-plugins").then((m) => {
      if (m.injectTableStyles) m.injectTableStyles();
    }).catch(() => {});
  }, []);

  const lazyPluginsConfig = useMemo(() => [
    {
      loader: (tier: import('@inkstream/editor-core').LicenseTier) =>
        import('@inkstream-dev/pro-plugins').then(m => ({ table: m.createProPlugins(tier).table })),
      requiredTier: 'pro' as const,
      pluginKey: 'table',
    },
    {
      loader: (tier: import('@inkstream/editor-core').LicenseTier) =>
        import('@inkstream-dev/pro-plugins').then(m => ({ advancedExport: m.createProPlugins(tier).advancedExport })),
      requiredTier: 'pro' as const,
      pluginKey: 'advancedExport',
    },
    {
      loader: (tier: import('@inkstream/editor-core').LicenseTier) =>
        import('@inkstream-dev/pro-plugins').then(m => ({ aiAssistant: m.createProPlugins(tier).aiAssistant })),
      requiredTier: 'premium' as const,
      pluginKey: 'aiAssistant',
    },
  ], []);

  const { loadedPlugins: proPluginsLoaded, isLoading: isLoadingProPlugins } = useLazyPlugins({
    validatedTier,
    lazyPlugins: lazyPluginsConfig,
  });

  const allPlugins = useMemo(() => [
    availablePlugins.bold,
    availablePlugins.italic,
    availablePlugins.underline,
    availablePlugins.strike,
    availablePlugins.code,
    headingPlugin,
    availablePlugins.alignLeft,
    availablePlugins.alignCenter,
    availablePlugins.alignRight,
    availablePlugins.indent,
    availablePlugins.bulletList,
    availablePlugins.orderedList,
    availablePlugins.listItem,
    availablePlugins.blockquote,
    availablePlugins.codeBlock,
    availablePlugins.image,
    availablePlugins.textColor,
    availablePlugins.highlight,
    availablePlugins.horizontalLine,
    availablePlugins.history,
    linkBubbleWrapperPlugin,
    ...proPluginsLoaded,
  ], [proPluginsLoaded]);

  const handleLicenseError = (plugin: Plugin, requiredTier: string) => {
    console.warn(`License required: Plugin "${plugin.name}" needs ${requiredTier} tier`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50">
      <div className="w-full max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Inkstream Editor Demo</h1>
          <p className="text-gray-600 mb-6">
            Test the freemium model with different license tiers
          </p>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <label className="block text-left mb-2 font-semibold">
              License Key (Optional)
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value)}
              placeholder="Enter license key (e.g., INKSTREAM-PRO-ABC123)"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 text-left">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Validated Tier:</strong>{" "}
                <span className={`font-bold ${
                  validatedTier === "premium" ? "text-purple-600" :
                  validatedTier === "pro" ? "text-blue-600" :
                  "text-green-600"
                }`}>
                  {validatedTier.toUpperCase()}
                </span>
                {isValidating && (
                  <span className="ml-2 text-xs text-gray-400">(Validating…)</span>
                )}
                {isLoadingProPlugins && (
                  <span className="ml-2 text-xs text-gray-500">(Loading pro features…)</span>
                )}
                {licenseError && (
                  <span className="ml-2 text-xs text-red-500">{licenseError}</span>
                )}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>💡 <strong>Free:</strong> Basic formatting, lists, images</p>
                <p>💼 <strong>Pro:</strong> + Tables, Advanced Export</p>
                <p>✨ <strong>Premium:</strong> + AI Writing Assistant</p>
                <hr className="my-2" />
                <p>Test keys: INKSTREAM-PRO-ABC123 · INKSTREAM-PREMIUM-XYZ789</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <EditorWithTableDialog
            key="inkstream-editor-instance"
            initialContent="<p>Try out the editor! Your tier determines which features you can use.</p>"
            plugins={allPlugins}
            licenseKey={licenseKey}
            licenseValidationEndpoint={VALIDATION_ENDPOINT}
            onLicenseError={handleLicenseError}
            pluginOptions={{
              fontFamily: {
                fontFamilies: ['Arial', 'Georgia', 'Helvetica', 'Tahoma', 'Times New Roman', 'Verdana']
              }
            }}
            toolbarLayout={[
              "undo", "redo", "|",
              "heading", "bold", "italic", "underline", "strike", "link", "|",
              "indent", "outdent", "|",
              "alignLeft", "alignCenter", "alignRight", "|",
              "bulletList", "orderedList", "codeBlock", "code", "|",
              "image", "textColor", "highlight", "|",
              "blockquote", "horizontalLine", "|",
              "table", "export", "|",
              "aiAssistant",
            ]}
          />
        </div>
      </div>
    </main>
  );
}


