import { NextResponse } from 'next/server';

/**
 * Server-side license validation endpoint.
 *
 * In production, replace VALID_LICENSE_KEYS with a database lookup or a call
 * to your licensing service (e.g., Stripe, Paddle, LemonSqueezy, or a custom
 * key store). The client receives only the tier — never raw key metadata.
 *
 * Security notes:
 * - The client cannot forge a tier by crafting a key string; this endpoint
 *   is the single source of truth.
 * - Add rate limiting (e.g., via middleware) before deploying to production.
 * - Consider adding request signing or an API secret header for extra hardening.
 */

interface LicenseRecord {
  tier: 'free' | 'pro' | 'premium';
  expiresAt: string | null; // ISO 8601, or null for perpetual licenses
}

// In production: replace with a database or external licensing service call.
const VALID_LICENSE_KEYS: Record<string, LicenseRecord> = {
  'INKSTREAM-PRO-ABC123': { tier: 'pro', expiresAt: null },
  'INKSTREAM-PREMIUM-XYZ789': { tier: 'premium', expiresAt: null },
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { isValid: false, tier: 'free', reason: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { licenseKey } = body as { licenseKey?: unknown };

  if (!licenseKey || typeof licenseKey !== 'string') {
    return NextResponse.json(
      { isValid: false, tier: 'free', reason: 'Missing licenseKey' },
      { status: 400 }
    );
  }

  const record = VALID_LICENSE_KEYS[licenseKey];

  if (!record) {
    return NextResponse.json({ isValid: false, tier: 'free', reason: 'License key not found' });
  }

  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    return NextResponse.json({ isValid: false, tier: 'free', reason: 'License key expired' });
  }

  return NextResponse.json({
    isValid: true,
    tier: record.tier,
    expiresAt: record.expiresAt,
  });
}
