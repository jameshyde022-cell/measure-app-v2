'use client';

import { useState } from 'react';

const S = {
  page: { background: '#0d0d0d', minHeight: '100vh', color: '#f0ebe0', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 },
  lbl: { fontSize: 9, color: '#555', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6, display: 'block' },
  inp: { fontFamily: 'monospace', fontSize: 12, padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: 2, background: '#080808', color: '#f0ebe0', width: '100%', boxSizing: 'border-box' },
};

export default function PricingPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeValid, setCodeValid] = useState(null); // null | true | false
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleCheckout = async () => {
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, referralCode: codeValid ? code : '' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Something went wrong.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const hasDiscount = codeValid === true;

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 420, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            MEAS<span style={{ color: '#e8b84b' }}>UR</span>E
          </div>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Professional Garment Annotation
          </div>
        </div>

        {/* Pricing card */}
        <div style={{ background: '#080808', border: '1px solid #1e1e1e', borderRadius: 4, padding: '32px', marginBottom: 16 }}>

          {/* Price display */}
          <div style={{ textAlign: 'center', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #1a1a1a' }}>
            {hasDiscount ? (
              <>
                <div style={{ fontSize: 11, color: '#81C784', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                  ✓ Referral Code Applied
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 700, color: '#e8b84b' }}>$9.99</span>
                  <span style={{ fontSize: 12, color: '#555' }}>/mo</span>
                </div>
                <div style={{ fontSize: 10, color: '#81C784', marginTop: 6 }}>
                  First 2 months for the price of 1 · Then $9.99/mo
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 700, color: '#e8b84b' }}>$9.99</span>
                  <span style={{ fontSize: 12, color: '#555' }}>/mo</span>
                </div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 6 }}>Cancel anytime</div>
              </>
            )}
          </div>

          {/* Features */}
          <div style={{ marginBottom: 28 }}>
            {[
              'Ghost mannequin image generation',
              'Unlimited garment annotations',
              'Professional spec sheet export',
              'All measurement presets',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#e8b84b', fontSize: 10 }}>◆</span>
                <span style={{ fontSize: 11, color: '#888' }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Email */}
          <div style={{ marginBottom: 12 }}>
            <label style={S.lbl}>Email</label>
            <input style={S.inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>

          {/* Referral code */}
          <div style={{ marginBottom: 20 }}>
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
              <div style={{ fontSize: 9, color: '#81C784', marginTop: 5 }}>✓ Code valid — 2 months for the price of 1!</div>
            )}
          </div>

          {error && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 2, background: '#1a0a0a', border: '1px solid #c8401a' }}>
              <span style={{ fontSize: 10, color: '#EF9A9A' }}>{error}</span>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: '#e8b84b', border: 'none', fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, cursor: 'pointer', borderRadius: 2, color: '#0d0d0d', letterSpacing: '0.04em' }}
          >
            {loading ? 'Redirecting…' : 'Subscribe Now →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 9, color: '#333', letterSpacing: '0.1em' }}>
          Secured by Stripe · Cancel anytime
        </div>

      </div>
    </div>
  );
}
