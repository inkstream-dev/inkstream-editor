import { renderHook, act } from '@testing-library/react';
import { useLicenseValidation } from './useLicenseValidation';
import { validateLicense } from '@inkstream/editor-core';

jest.mock('@inkstream/editor-core', () => ({
  ...jest.requireActual('@inkstream/editor-core'),
  validateLicense: jest.fn(),
}));

const mockValidateLicense = validateLicense as jest.MockedFunction<typeof validateLicense>;

describe('useLicenseValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with free tier, not validating, no error', async () => {
    mockValidateLicense.mockResolvedValue({ tier: 'free', error: null });

    const { result } = renderHook(() =>
      useLicenseValidation({})
    );

    // Before the promise resolves: isValidating should be true
    expect(result.current.tier).toBe('free');
    expect(result.current.error).toBeNull();

    await act(async () => {});

    expect(result.current.tier).toBe('free');
    expect(result.current.isValidating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isValidating true while the promise is pending', async () => {
    let resolve!: (v: { tier: 'pro'; error: null }) => void;
    const pending = new Promise<{ tier: 'pro'; error: null }>(r => (resolve = r));
    mockValidateLicense.mockReturnValue(pending as ReturnType<typeof validateLicense>);

    const { result } = renderHook(() =>
      useLicenseValidation({ licenseKey: 'INKSTREAM-PRO-TEST' })
    );

    expect(result.current.isValidating).toBe(true);

    await act(async () => {
      resolve({ tier: 'pro', error: null });
      await pending;
    });

    expect(result.current.isValidating).toBe(false);
    expect(result.current.tier).toBe('pro');
  });

  it('updates tier and clears error on successful validation', async () => {
    mockValidateLicense.mockResolvedValue({ tier: 'premium', error: null });

    const { result } = renderHook(() =>
      useLicenseValidation({ licenseKey: 'INKSTREAM-PREMIUM-XYZ', validationEndpoint: '/api/license' })
    );

    await act(async () => {});

    expect(result.current.tier).toBe('premium');
    expect(result.current.error).toBeNull();
    expect(result.current.isValidating).toBe(false);
  });

  it('sets error when validation fails', async () => {
    mockValidateLicense.mockResolvedValue({ tier: 'free', error: 'Invalid license key' });

    const { result } = renderHook(() =>
      useLicenseValidation({ licenseKey: 'INKSTREAM-PRO-BAD', validationEndpoint: '/api/license' })
    );

    await act(async () => {});

    expect(result.current.tier).toBe('free');
    expect(result.current.error).toBe('Invalid license key');
  });

  it('re-runs validation when licenseKey changes', async () => {
    mockValidateLicense
      .mockResolvedValueOnce({ tier: 'pro', error: null })
      .mockResolvedValueOnce({ tier: 'premium', error: null });

    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useLicenseValidation({ licenseKey: key }),
      { initialProps: { key: 'INKSTREAM-PRO-A' } }
    );

    await act(async () => {});
    expect(result.current.tier).toBe('pro');

    rerender({ key: 'INKSTREAM-PREMIUM-B' });
    await act(async () => {});
    expect(result.current.tier).toBe('premium');
    expect(mockValidateLicense).toHaveBeenCalledTimes(2);
  });

  it('re-runs validation when validationEndpoint changes', async () => {
    mockValidateLicense
      .mockResolvedValueOnce({ tier: 'free', error: null })
      .mockResolvedValueOnce({ tier: 'pro', error: null });

    const { result, rerender } = renderHook(
      ({ endpoint }: { endpoint: string | undefined }) =>
        useLicenseValidation({ licenseKey: 'INKSTREAM-PRO-X', validationEndpoint: endpoint }),
      { initialProps: { endpoint: undefined as string | undefined } }
    );

    await act(async () => {});
    expect(result.current.tier).toBe('free');

    rerender({ endpoint: '/api/validate' });
    await act(async () => {});
    expect(result.current.tier).toBe('pro');
  });

  it('does not update state after unmount (cancelled flag)', async () => {
    let resolveOuter!: (v: { tier: 'pro'; error: null }) => void;
    const slow = new Promise<{ tier: 'pro'; error: null }>(r => (resolveOuter = r));
    mockValidateLicense.mockReturnValue(slow as ReturnType<typeof validateLicense>);

    const { result, unmount } = renderHook(() =>
      useLicenseValidation({ licenseKey: 'INKSTREAM-PRO-SLOW' })
    );

    unmount();

    await act(async () => {
      resolveOuter({ tier: 'pro', error: null });
      await slow;
    });

    // After unmount, state must not have been updated — tier stays 'free'
    expect(result.current.tier).toBe('free');
  });
});
