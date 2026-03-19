/**
 * @jest-environment jsdom
 *
 * Full component smoke tests for RichTextEditor.
 * EditorView needs real DOM APIs — jsdom provides them.
 */

import React, { createRef } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { RichTextEditor } from './index';
import type { EditorRef } from './index';
import { validateLicense } from '@inkstream/editor-core';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@inkstream/editor-core', () => ({
  ...jest.requireActual('@inkstream/editor-core'),
  validateLicense: jest.fn(),
}));

const mockValidateLicense = validateLicense as jest.MockedFunction<typeof validateLicense>;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockValidateLicense.mockResolvedValue({ tier: 'free', error: null });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RichTextEditor', () => {
  it('mounts without throwing', async () => {
    await act(async () => {
      render(<RichTextEditor initialContent="<p>Hello</p>" />);
    });
    // Component mounted — the wrapper div should be in the document
    expect(document.querySelector('.inkstream-editor-wrapper')).not.toBeNull();
  });

  it('renders the editor wrapper element', async () => {
    await act(async () => {
      render(<RichTextEditor initialContent="" />);
    });
    expect(document.querySelector('.inkstream-editor')).not.toBeNull();
  });

  it('ref.getView() returns a non-null EditorView after mount', async () => {
    const ref = createRef<EditorRef>();

    await act(async () => {
      render(<RichTextEditor ref={ref} initialContent="<p>Test</p>" />);
    });

    expect(ref.current).not.toBeNull();
    expect(ref.current?.getView()).not.toBeNull();
  });

  it('ref.getContent() returns an HTML string', async () => {
    const ref = createRef<EditorRef>();

    await act(async () => {
      render(<RichTextEditor ref={ref} initialContent="<p>Content</p>" />);
    });

    const content = ref.current?.getContent();
    expect(typeof content).toBe('string');
  });

  it('ref.chain() returns an object with a run() method', async () => {
    const ref = createRef<EditorRef>();

    await act(async () => {
      render(<RichTextEditor ref={ref} initialContent="" />);
    });

    const chain = ref.current?.chain();
    expect(chain).toBeDefined();
    expect(typeof chain?.run).toBe('function');
  });

  it('ref.can() returns an object with a run() method', async () => {
    const ref = createRef<EditorRef>();

    await act(async () => {
      render(<RichTextEditor ref={ref} initialContent="" />);
    });

    const can = ref.current?.can();
    expect(can).toBeDefined();
    expect(typeof can?.run).toBe('function');
  });

  it('renders only the wrapper when immediatelyRender=false (deferred SSR mode)', async () => {
    // RTL wraps render in act() so effects fire; what we verify is that the
    // component fully works in deferred mode after effects run.
    await act(async () => {
      render(<RichTextEditor initialContent="<p>SSR</p>" immediatelyRender={false} />);
    });

    // After effects, isMounted becomes true → full editor should be present
    expect(document.querySelector('.inkstream-editor-wrapper')).not.toBeNull();
    expect(document.querySelector('.inkstream-editor')).not.toBeNull();
  });

  it('does not call onChange before any user interaction', async () => {
    const onChange = jest.fn();

    await act(async () => {
      render(<RichTextEditor initialContent="<p>Initial</p>" onChange={onChange} />);
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies dark theme class when theme="dark"', async () => {
    await act(async () => {
      render(<RichTextEditor initialContent="" theme="dark" />);
    });

    expect(document.querySelector('.inkstream-dark')).not.toBeNull();
  });

  it('applies light theme class when theme="light"', async () => {
    await act(async () => {
      render(<RichTextEditor initialContent="" theme="light" />);
    });

    expect(document.querySelector('.inkstream-light')).not.toBeNull();
  });

  it('calls onEditorReady with an EditorView once mounted', async () => {
    const onReady = jest.fn();

    await act(async () => {
      render(<RichTextEditor initialContent="" onEditorReady={onReady} />);
    });

    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    const [view] = onReady.mock.calls[0];
    expect(view).not.toBeNull();
    expect(typeof view.dispatch).toBe('function');
  });

  it('destroys the editor when the component unmounts', async () => {
    const ref = createRef<EditorRef>();
    const { unmount } = await act(async () =>
      render(<RichTextEditor ref={ref} initialContent="" />)
    );

    expect(ref.current?.getView()).not.toBeNull();

    await act(async () => {
      unmount();
    });

    // After unmount React clears the ref → ref.current is null
    expect(ref.current).toBeNull();
  });
});
