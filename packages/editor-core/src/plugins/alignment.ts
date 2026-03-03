import { Schema } from 'prosemirror-model';
import { EditorState, Transaction } from 'prosemirror-state';
import { createPlugin } from './plugin-factory';
import { ToolbarItem } from './index';
import { setAlignment, getActiveAlignment, AlignValue } from '../commands/alignment';

// ---------------------------------------------------------------------------
// SVG icon strings (inline SVG, uses currentColor for theme compatibility)
// 16×16 viewBox; four horizontal lines represent text rows at each alignment
// ---------------------------------------------------------------------------

const svgLeft = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
  <rect x="1" y="2"    width="14" height="2" rx="1"/>
  <rect x="1" y="6"    width="10" height="2" rx="1"/>
  <rect x="1" y="10"   width="12" height="2" rx="1"/>
  <rect x="1" y="14"   width="8"  height="2" rx="1"/>
</svg>`;

const svgCenter = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
  <rect x="1" y="2"    width="14" height="2" rx="1"/>
  <rect x="3" y="6"    width="10" height="2" rx="1"/>
  <rect x="2" y="10"   width="12" height="2" rx="1"/>
  <rect x="4" y="14"   width="8"  height="2" rx="1"/>
</svg>`;

const svgRight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
  <rect x="1" y="2"    width="14" height="2" rx="1"/>
  <rect x="5" y="6"    width="10" height="2" rx="1"/>
  <rect x="3" y="10"   width="12" height="2" rx="1"/>
  <rect x="7" y="14"   width="8"  height="2" rx="1"/>
</svg>`;

const svgJustify = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
  <rect x="1" y="2"    width="14" height="2" rx="1"/>
  <rect x="1" y="6"    width="14" height="2" rx="1"/>
  <rect x="1" y="10"   width="14" height="2" rx="1"/>
  <rect x="1" y="14"   width="10" height="2" rx="1"/>
</svg>`;

// ---------------------------------------------------------------------------
// isActive helper
// ---------------------------------------------------------------------------
function isAlignmentActive(value: AlignValue) {
  return (state: EditorState): boolean => getActiveAlignment(state) === value;
}

// ---------------------------------------------------------------------------
// Unified alignment plugin
// ---------------------------------------------------------------------------
export const alignmentPlugin = createPlugin({
  name: 'alignment',

  getToolbarItems: (_schema: Schema): ToolbarItem[] => [
    {
      id: 'alignLeft',
      icon: '',
      iconHtml: svgLeft,
      tooltip: 'Align Left (Ctrl+Shift+L)',
      command: setAlignment('left'),
      isActive: isAlignmentActive('left'),
    },
    {
      id: 'alignCenter',
      icon: '',
      iconHtml: svgCenter,
      tooltip: 'Align Center (Ctrl+Shift+E)',
      command: setAlignment('center'),
      isActive: isAlignmentActive('center'),
    },
    {
      id: 'alignRight',
      icon: '',
      iconHtml: svgRight,
      tooltip: 'Align Right (Ctrl+Shift+R)',
      command: setAlignment('right'),
      isActive: isAlignmentActive('right'),
    },
    {
      id: 'alignJustify',
      icon: '',
      iconHtml: svgJustify,
      tooltip: 'Justify (Ctrl+Shift+J)',
      command: setAlignment('justify'),
      isActive: isAlignmentActive('justify'),
    },
  ],

  getKeymap: (_schema: Schema): { [key: string]: any } => ({
    'Mod-Shift-l': (state: EditorState, dispatch?: (tr: Transaction) => void) =>
      setAlignment('left')(state, dispatch),
    'Mod-Shift-e': (state: EditorState, dispatch?: (tr: Transaction) => void) =>
      setAlignment('center')(state, dispatch),
    'Mod-Shift-r': (state: EditorState, dispatch?: (tr: Transaction) => void) =>
      setAlignment('right')(state, dispatch),
    'Mod-Shift-j': (state: EditorState, dispatch?: (tr: Transaction) => void) =>
      setAlignment('justify')(state, dispatch),
  }),
});
