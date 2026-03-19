import { renderHook, act } from '@testing-library/react';
import { useLazyPlugins } from './useLazyPlugins';
import type { Plugin } from '@inkstream/editor-core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlugin(name: string): Plugin {
  return { key: { key: name }, spec: {} } as unknown as Plugin;
}

function makeLoader(plugin: Plugin, delay = 0): () => Promise<{ default: Plugin }> {
  return () =>
    new Promise(resolve =>
      setTimeout(() => resolve({ default: plugin }), delay)
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLazyPlugins', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns empty plugins and not loading when lazyPlugins list is empty', async () => {
    const { result } = renderHook(() =>
      useLazyPlugins({ validatedTier: 'free' })
    );
    expect(result.current.loadedPlugins).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not load pro plugin for free tier', async () => {
    const loader = jest.fn().mockResolvedValue({ default: makePlugin('proPlugin') });

    const { result } = renderHook(() =>
      useLazyPlugins({
        validatedTier: 'free',
        lazyPlugins: [{ loader, requiredTier: 'pro' }],
      })
    );

    await act(async () => {});

    expect(loader).not.toHaveBeenCalled();
    expect(result.current.loadedPlugins).toHaveLength(0);
  });

  it('loads pro plugin for pro tier', async () => {
    const proPlugin = makePlugin('proPlugin');
    const loader = jest.fn().mockResolvedValue({ default: proPlugin });

    const { result } = renderHook(() =>
      useLazyPlugins({
        validatedTier: 'pro',
        lazyPlugins: [{ loader, requiredTier: 'pro' }],
      })
    );

    await act(async () => {});

    expect(loader).toHaveBeenCalledWith('pro');
    expect(result.current.loadedPlugins).toContain(proPlugin);
    expect(result.current.isLoading).toBe(false);
  });

  it('loads pro plugin for premium tier', async () => {
    const proPlugin = makePlugin('proPlugin');
    const loader = jest.fn().mockResolvedValue({ default: proPlugin });

    const { result } = renderHook(() =>
      useLazyPlugins({
        validatedTier: 'premium',
        lazyPlugins: [{ loader, requiredTier: 'pro' }],
      })
    );

    await act(async () => {});

    expect(result.current.loadedPlugins).toContain(proPlugin);
  });

  it('does not load premium plugin for pro tier', async () => {
    const loader = jest.fn().mockResolvedValue({ default: makePlugin('premiumPlugin') });

    const { result } = renderHook(() =>
      useLazyPlugins({
        validatedTier: 'pro',
        lazyPlugins: [{ loader, requiredTier: 'premium' }],
      })
    );

    await act(async () => {});

    expect(loader).not.toHaveBeenCalled();
    expect(result.current.loadedPlugins).toHaveLength(0);
  });

  it('sets isLoading true during async load', async () => {
    jest.useFakeTimers();
    const plugin = makePlugin('proPlugin');
    const loader = jest.fn(() =>
      new Promise<{ default: Plugin }>(resolve =>
        setTimeout(() => resolve({ default: plugin }), 100)
      )
    );

    const { result } = renderHook(() =>
      useLazyPlugins({
        validatedTier: 'pro',
        lazyPlugins: [{ loader, requiredTier: 'pro' }],
      })
    );

    // Right after mount, should be loading
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.loadedPlugins).toContain(plugin);
  });

  it('sets error and returns empty plugins when loader throws', async () => {
    const loader = jest.fn().mockRejectedValue(new Error('network error'));
    // Stable reference — prevents the effect from re-running on every re-render
    // caused by setError(), which would create an infinite load/fail loop.
    const plugins = [{ loader, requiredTier: 'pro' as const }];

    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useLazyPlugins({ validatedTier: 'pro', lazyPlugins: plugins })
    );

    await act(async () => {});

    (console.error as jest.Mock).mockRestore();

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toMatch(/network error|Failed to load/);
    expect(result.current.loadedPlugins).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('does not reload plugins if tier has not changed', async () => {
    const loader = jest.fn().mockResolvedValue({ default: makePlugin('proPlugin') });
    const plugins = [{ loader, requiredTier: 'pro' as const }];

    const { rerender } = renderHook(
      ({ tier }: { tier: 'free' | 'pro' | 'premium' }) =>
        useLazyPlugins({ validatedTier: tier, lazyPlugins: plugins }),
      { initialProps: { tier: 'pro' as const } }
    );

    await act(async () => {});

    const callCount = loader.mock.calls.length;

    // Re-render with same tier — should NOT trigger another load
    rerender({ tier: 'pro' });

    await act(async () => {});

    expect(loader).toHaveBeenCalledTimes(callCount);
  });

  it('defaults to free tier when validatedTier is omitted', async () => {
    const loader = jest.fn().mockResolvedValue({ default: makePlugin('proPlugin') });

    renderHook(() =>
      useLazyPlugins({
        lazyPlugins: [{ loader, requiredTier: 'pro' }],
      })
    );

    await act(async () => {});

    expect(loader).not.toHaveBeenCalled();
  });

  it('resolves named export when pluginKey is specified', async () => {
    const plugin = makePlugin('table');
    const loader = jest.fn().mockResolvedValue({ table: plugin });

    const { result } = renderHook(() =>
      useLazyPlugins({
        validatedTier: 'pro',
        lazyPlugins: [{ loader, requiredTier: 'pro', pluginKey: 'table' }],
      })
    );

    await act(async () => {});

    expect(result.current.loadedPlugins).toContain(plugin);
  });
});
