"use client";

import { RichTextEditor } from "@inkstream/react-editor";
import { availablePlugins } from "@inkstream/editor-core";
import { proPlugins } from "@inkstream/pro-plugins";
import { useState, useMemo } from "react";

export default function Home() {
  const [licenseKey, setLicenseKey] = useState<string>("");
  const [currentTier, setCurrentTier] = useState<string>("free");

  // Memoize plugins to prevent recreation on every render
  const allPlugins = useMemo(() => {
    return [
      availablePlugins.bold,
      availablePlugins.italic,
      availablePlugins.underline,
      availablePlugins.strike,
      availablePlugins.code,
      availablePlugins.heading,
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
      availablePlugins.linkBubble,
      // PRO features
      proPlugins.table,
      proPlugins.advancedExport,
      // PREMIUM features
      proPlugins.aiAssistant,
    ];
  }, []); // Empty deps - create once

  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setLicenseKey(key);
    
    // Determine tier from key format
    if (key.startsWith("INKSTREAM-PREMIUM-")) {
      setCurrentTier("premium");
    } else if (key.startsWith("INKSTREAM-PRO-")) {
      setCurrentTier("pro");
    } else {
      setCurrentTier("free");
    }
  };

  const handleLicenseError = (plugin: any, requiredTier: string) => {
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
          
          {/* License Key Input */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <label className="block text-left mb-2 font-semibold">
              License Key (Optional)
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={handleLicenseChange}
              placeholder="Enter license key (e.g., INKSTREAM-PRO-ABC123)"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 text-left">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Current Tier:</strong>{" "}
                <span className={`font-bold ${
                  currentTier === "premium" ? "text-purple-600" :
                  currentTier === "pro" ? "text-blue-600" :
                  "text-green-600"
                }`}>
                  {currentTier.toUpperCase()}
                </span>
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>💡 <strong>Free:</strong> Basic formatting, lists, images</p>
                <p>💼 <strong>Pro:</strong> + Tables, Advanced Export</p>
                <p>✨ <strong>Premium:</strong> + AI Writing Assistant</p>
                <hr className="my-2" />
                <p className="text-xs">Test keys:</p>
                <p>• INKSTREAM-PRO-ABC123</p>
                <p>• INKSTREAM-PREMIUM-XYZ789</p>
              </div>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <RichTextEditor 
            key="inkstream-editor-instance" 
            initialContent="<p>Try out the editor! Your tier determines which features you can use.</p>" 
            plugins={allPlugins}
            licenseKey={licenseKey}
            onLicenseError={handleLicenseError}
            pluginOptions={{
              fontFamily: {
                fontFamilies: ['Arial', 'Georgia', 'Helvetica', 'Tahoma', 'Times New Roman', 'Verdana']
              }
            }}
            toolbarLayout={[
              "undo", 
              "redo", 
              "|",
              "heading",
              "bold", 
              "italic", 
              "underline", 
              "strike", 
              "link",
              "|",
              "indent", 
              "outdent", 
              "|",
              "alignLeft",
              "alignCenter",
              "alignRight",
              "|",
              "bulletList", 
              "orderedList", 
              "codeBlock",
              "code", 
              "|",
              "image", 
              "textColor", 
              "highlight", 
              "|",
              "blockquote", 
              "horizontalLine",
              "|",
              // Pro features
              "insertTable",
              "tableActions",
              "export",
              "|",
              // Premium features
              "aiAssistant",
            ]}
          />
        </div>
      </div>
    </main>
  );
}