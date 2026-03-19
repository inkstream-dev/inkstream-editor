import { validateLicense, clearLicenseCache } from './validateLicense';

// Must satisfy ^INKSTREAM-(FREE|PRO|PREMIUM)-[A-Z0-9]+$/i
const VALID_KEY = 'INKSTREAM-PRO-ABCD1234EFGH';
const ENDPOINT = 'https://license.example.com/validate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(response: unknown, ok = true, status = 200) {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(response),
  } as unknown as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
  clearLicenseCache();
});

// ---------------------------------------------------------------------------
// No key / no endpoint → "free" tier, no network call
// ---------------------------------------------------------------------------

describe('validateLicense — no key / no endpoint', () => {
  it('returns free tier when no licenseKey is provided', async () => {
    const result = await validateLicense({ licenseKey: undefined, validationEndpoint: ENDPOINT });
    expect(result.tier).toBe('free');
  });

  it('makes no fetch call when licenseKey is absent', async () => {
    const spy = mockFetch({});
    await validateLicense({ licenseKey: undefined, validationEndpoint: ENDPOINT });
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns free tier when no endpoint is provided', async () => {
    const result = await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: undefined });
    expect(result.tier).toBe('free');
  });

  it('makes no fetch call when endpoint is absent', async () => {
    const spy = mockFetch({});
    await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: undefined });
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns free tier when both key and endpoint are absent', async () => {
    const result = await validateLicense({});
    expect(result.tier).toBe('free');
  });
});

// ---------------------------------------------------------------------------
// Bad format
// ---------------------------------------------------------------------------

describe('validateLicense — bad key format', () => {
  it('returns free tier for a key that does not match the expected pattern', async () => {
    const spy = mockFetch({});
    const result = await validateLicense({ licenseKey: 'bad-format', validationEndpoint: ENDPOINT });
    expect(result.tier).toBe('free');
    expect(spy).not.toHaveBeenCalled();
  });

  it('includes an error message for bad format', async () => {
    const result = await validateLicense({ licenseKey: 'bad', validationEndpoint: ENDPOINT });
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Successful validation
// ---------------------------------------------------------------------------

describe('validateLicense — successful server validation', () => {
  it('returns the server-provided tier when isValid is true', async () => {
    mockFetch({ isValid: true, tier: 'pro' });
    const result = await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    expect(result.tier).toBe('pro');
  });

  it('returns no error when isValid is true', async () => {
    mockFetch({ isValid: true, tier: 'pro' });
    const result = await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    expect(result.error).toBeNull();
  });

  it('calls fetch with POST method and JSON content-type', async () => {
    const spy = mockFetch({ isValid: true, tier: 'pro' });
    await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('sends licenseKey in the request body', async () => {
    const spy = mockFetch({ isValid: true, tier: 'pro' });
    await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    const body = JSON.parse(spy.mock.calls[0][1]!.body as string);
    expect(body.licenseKey).toBe(VALID_KEY);
  });
});

// ---------------------------------------------------------------------------
// Failed validation (isValid: false)
// ---------------------------------------------------------------------------

describe('validateLicense — failed server validation', () => {
  it('returns free tier when isValid is false', async () => {
    mockFetch({ isValid: false, reason: 'License expired' });
    const result = await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    expect(result.tier).toBe('free');
  });

  it('surfaces the server message as result.error', async () => {
    mockFetch({ isValid: false, reason: 'License expired' });
    const result = await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    expect(result.error).toContain('License expired');
  });
});

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------

describe('validateLicense — caching', () => {
  it('does not call fetch on a second call with the same key+endpoint', async () => {
    const spy = mockFetch({ isValid: true, tier: 'pro' });
    await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns the cached tier on the second call', async () => {
    mockFetch({ isValid: true, tier: 'pro' });
    await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isValid: true, tier: 'enterprise' }),
    } as unknown as Response);
    const result = await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    expect(result.tier).toBe('pro'); // cached, not 'enterprise'
  });

  it('different key+endpoint pairs are cached independently', async () => {
    const KEY2 = 'INKSTREAM-PRO-ZZZZ9999YYYY';
    mockFetch({ isValid: true, tier: 'enterprise' });
    await validateLicense({ licenseKey: KEY2, validationEndpoint: ENDPOINT });

    jest.restoreAllMocks();
    mockFetch({ isValid: true, tier: 'pro' });
    await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });

    // First key still cached
    jest.restoreAllMocks();
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isValid: true, tier: 'other' }),
    } as unknown as Response);
    const r1 = await validateLicense({ licenseKey: KEY2, validationEndpoint: ENDPOINT });
    expect(r1.tier).toBe('enterprise'); // cached
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// clearLicenseCache()
// ---------------------------------------------------------------------------

describe('clearLicenseCache()', () => {
  it('clearLicenseCache() with a specific key evicts only that entry', async () => {
    const KEY2 = 'INKSTREAM-PRO-ZZZZ9999YYYY';
    mockFetch({ isValid: true, tier: 'pro' });
    await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    await validateLicense({ licenseKey: KEY2, validationEndpoint: ENDPOINT });
    jest.restoreAllMocks();

    // Cache key is just the licenseKey string
    clearLicenseCache(VALID_KEY);

    const spy = mockFetch({ isValid: true, tier: 'enterprise' });
    await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT }); // should refetch
    const r2 = await validateLicense({ licenseKey: KEY2, validationEndpoint: ENDPOINT }); // still cached
    expect(spy).toHaveBeenCalledTimes(1);
    expect(r2.tier).toBe('pro');
  });

  it('clearLicenseCache() without argument evicts all entries', async () => {
    const KEY2 = 'INKSTREAM-PRO-ZZZZ9999YYYY';
    mockFetch({ isValid: true, tier: 'pro' });
    await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    await validateLicense({ licenseKey: KEY2, validationEndpoint: ENDPOINT });
    jest.restoreAllMocks();

    clearLicenseCache();

    const spy = mockFetch({ isValid: true, tier: 'enterprise' });
    await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    await validateLicense({ licenseKey: KEY2, validationEndpoint: ENDPOINT });
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Network errors
// ---------------------------------------------------------------------------

describe('validateLicense — network errors', () => {
  it('returns free tier when fetch rejects', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'));
    const result = await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    expect(result.tier).toBe('free');
  });

  it('does not throw when fetch rejects', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    await expect(validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT })).resolves.not.toThrow();
  });

  it('includes an error property when fetch rejects', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'));
    const result = await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    expect(result.error).toBeDefined();
  });

  it('returns free tier when response.ok is false', async () => {
    mockFetch({ message: 'Unauthorized' }, false, 401);
    const result = await validateLicense({ licenseKey: VALID_KEY, validationEndpoint: ENDPOINT });
    expect(result.tier).toBe('free');
  });
});
