'use client';

import { useState } from 'react';

const S = {
  page: { background: '#0d0d0d', minHeight: '100vh', color: '#f0ebe0', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
  lbl: { fontSize: 9, color: '#555', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6, display: 'block' },
  inp: { fontFamily: 'monospace', fontSize: 12, padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: 2, background: '#080808', color: '#f0ebe0', width: '100%', boxSizing: 'border-box' },
};

const FEATURES = [
  'Unlimited exports',
  'Ghost mannequin image generation',
  'AI model images',
  'Background cleanup',
  'All measurement presets',
  'Listing-ready export',
];

export default function PricingPage() {
  const [email, setEmail]           = useState('');
  const [code, setCode]             = useState('');
  const [codeValid, setCodeValid]   = useState(null); // null | true | false
  const [checking, setChecking]     = useState(false);
  const [loading, setLoading]       = useState(null); // null | 'monthly' | 'yearly'
  const [error, setError]           = useState(null);

  const checkCode = async () => {
    if (!code) return;
    setChecking(true);
    setCodeValid(null);
    try {
      const res = await fetch('/api/check-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setCodeValid(data.valid);
    } catch {
      setCodeValid(false);
    }
    setChecking(false);
  };

  const handleCheckout = async (plan) => {
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, referralCode: codeValid ? code : '', plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Something went wrong.');
        setLoading(null);
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(null);
    }
  };

  const hasDiscount = codeValid === true;

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 680, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            MEAS<span style={{ color: '#e8b84b' }}>UR</span>E
          </div>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Professional Garment Annotation
          </div>
        </div>

        {/* Referral banner */}
        {hasDiscount && (
          <div style={{ textAlign: 'center', marginBottom: 16, padding: '10px 16px', background: 'rgba(129,199,132,0.08)', border: '1px solid rgba(129,199,132,0.25)', borderRadius: 4 }}>
            <span style={{ fontSize: 11, color: '#81C784', letterSpacing: '0.1em' }}>
              ✓ Referral code applied — first month free on monthly plan
            </span>
          </div>
        )}

        {/* Email + referral — shared across both plans */}
        <div style={{ background: '#080808', border: '1px solid #1e1e1e', borderRadius: 4, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={S.lbl}>Your Email</label>
            <input
              style={S.inp}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label style={S.lbl}>Referral Code (optional)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...S.inp, textTransform: 'uppercase' }}
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setCodeValid(null); }}
                placeholder="e.g. SARAH20"
              />
              <button
                onClick={checkCode}
                disabled={!code || checking}
                style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #2a2a2a', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', cursor: 'pointer', borderRadius: 2, whiteSpace: 'nowrap' }}
              >
                {checking ? '…' : 'Apply'}
              </button>
            </div>
            {codeValid === false && (
              <div style={{ fontSize: 9, color: '#EF9A9A', marginTop: 5 }}>Invalid code.</div>
            )}
            {codeValid === true && (
              <div style={{ fontSize: 9, color: '#81C784', marginTop: 5 }}>✓ Code valid — first month free on monthly plan!</div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 2, background: '#1a0a0a', border: '1px solid #c8401a' }}>
            <span style={{ fontSize: 10, color: '#EF9A9A' }}>{error}</span>
          </div>
        )}

        {/* Plan cards */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

          {/* Monthly */}
          <div style={{ flex: 1, minWidth: 260, background: '#080808', border: '1px solid #1e1e1e', borderRadius: 4, padding: 28, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
                Pro Monthly
              </div>
              {hasDiscount ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: '#e8b84b' }}>$9.99</span>
                    <span style={{ fontSize: 12, color: '#555' }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#81C784' }}>First 2 months for the price of 1 · then $9.99/mo</div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: '#e8b84b' }}>$9.99</span>
                    <span style={{ fontSize: 12, color: '#555' }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#555' }}>Cancel anytime</div>
                </>
              )}
            </div>

            <div style={{ flex: 1, marginBottom: 24 }}>
              {FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: '#e8b84b', fontSize: 10, flexShrink: 0 }}>◆</span>
                  <span style={{ fontSize: 11, color: '#888' }}>{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleCheckout('monthly')}
              disabled={loading !== null}
              style={{ width: '100%', padding: '13px', background: loading === 'monthly' ? '#333' : '#e8b84b', border: 'none', fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, cursor: loading !== null ? 'not-allowed' : 'pointer', borderRadius: 2, color: '#0d0d0d', letterSpacing: '0.04em' }}
            >
              {loading === 'monthly' ? 'Redirecting…' : 'Subscribe Monthly →'}
            </button>
          </div>

          {/* Yearly */}
          <div style={{ flex: 1, minWidth: 260, background: '#080808', border: '1px solid rgba(232,184,75,0.35)', borderRadius: 4, padding: 28, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#e8b84b', color: '#0d0d0d', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
              Best Value
            </div>

            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
                Pro Yearly
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: '#e8b84b' }}>$29.99</span>
                <span style={{ fontSize: 12, color: '#555' }}>/yr</span>
              </div>
              <div style={{ fontSize: 10, color: '#555' }}>~$2.50/mo · save over 74% vs monthly</div>
            </div>

            <div style={{ flex: 1, marginBottom: 24 }}>
              {FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: '#e8b84b', fontSize: 10, flexShrink: 0 }}>◆</span>
                  <span style={{ fontSize: 11, color: '#888' }}>{f}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#e8b84b', fontSize: 10, flexShrink: 0 }}>◆</span>
                <span style={{ fontSize: 11, color: '#888' }}>Best for active clothing sellers</span>
              </div>
            </div>

            <button
              onClick={() => handleCheckout('yearly')}
              disabled={loading !== null}
              style={{ width: '100%', padding: '13px', background: loading === 'yearly' ? '#333' : '#e8b84b', border: 'none', fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, cursor: loading !== null ? 'not-allowed' : 'pointer', borderRadius: 2, color: '#0d0d0d', letterSpacing: '0.04em' }}
            >
              {loading === 'yearly' ? 'Redirecting…' : 'Subscribe Yearly →'}
            </button>
          </div>

        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 9, color: '#333', letterSpacing: '0.1em' }}>
          Secured by Stripe · Cancel anytime
        </div>

      </div>
    </div>
  );
}
