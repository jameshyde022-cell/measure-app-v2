'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const C = {
  bg: '#0d0d0d', surface: '#111111', card: '#0d0d0d', border: '#1e1e1e',
  gold: '#e8b84b', goldLight: 'rgba(232,184,75,0.10)', goldBorder: 'rgba(232,184,75,0.25)',
  text: '#f0ebe0', muted: '#666', dim: '#444',
  success: '#81C784', error: '#EF9A9A',
}

const REWARD_THRESHOLD = 5

function Section({ title, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: C.gold, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 20, fontFamily: 'monospace' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, valueStyle = {} }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: `1px solid ${C.border}`, marginBottom: 14 }}>
      <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, fontFamily: 'monospace', ...valueStyle }}>{value}</span>
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const copyCode = () => {
    if (!profile?.referral_code) return
    const link = `${window.location.origin}/signup?ref=${profile.referral_code}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const cancelSubscription = async () => {
    if (!confirm('Cancel your subscription? You will keep Pro access until the end of your current billing period.')) return
    setCancelling(true)
    setCancelError(null)
    try {
      const res = await fetch('/api/profile/cancel', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setCancelDone(true)
        setProfile(p => ({ ...p, stripe: { ...p.stripe, cancel_at_period_end: true } }))
      } else {
        setCancelError(data.error || 'Could not cancel. Please try again.')
      }
    } catch {
      setCancelError('Network error. Please try again.')
    }
    setCancelling(false)
  }

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 11, color: C.dim, fontFamily: 'monospace', letterSpacing: '0.1em' }}>Loading…</div>
      </div>
    )
  }

  if (!profile || profile.error) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: C.error, fontFamily: 'monospace', marginBottom: 16 }}>Unable to load profile.</div>
          <Link href="/login" style={{ fontSize: 12, color: C.gold, textDecoration: 'none', fontFamily: 'monospace' }}>Sign in again →</Link>
        </div>
      </div>
    )
  }

  const { email, is_pro, is_trial, trial_expires_at, referral_code, referral_count, paid_referral_count, referral_reward_applied, stripe, has_subscription } = profile
  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/signup?ref=${referral_code}` : `/signup?ref=${referral_code}`
  const progress = Math.min((paid_referral_count / REWARD_THRESHOLD) * 100, 100)

  const planLabel = is_trial ? 'Pro (Trial)' : is_pro ? 'Pro' : 'Free'
  const billingCycle = stripe?.billing_cycle || null
  const periodEnd = stripe?.current_period_end ? new Date(stripe.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null
  const isCancelledAtPeriodEnd = stripe?.cancel_at_period_end

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'monospace', padding: '60px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/app" style={{ fontSize: 11, color: C.dim, textDecoration: 'none', letterSpacing: '0.08em' }}>← Back to app</Link>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: C.gold, marginTop: 16, letterSpacing: '0.06em' }}>
            MEASURE
          </div>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            Your Account
          </div>
        </div>

        {/* Account section */}
        <Section title="Account">
          <Row label="Email" value={email} />
          <Row
            label="Plan"
            value={planLabel}
            valueStyle={{ color: is_pro ? C.gold : C.muted, fontWeight: 700 }}
          />
          {is_trial && trial_expires_at && (
            <Row
              label="Trial expires"
              value={new Date(trial_expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              valueStyle={{ color: '#f0c040' }}
            />
          )}
          {billingCycle && (
            <Row label="Billing cycle" value={billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} />
          )}
          {periodEnd && !isCancelledAtPeriodEnd && (
            <Row label="Next billing date" value={periodEnd} />
          )}
          {isCancelledAtPeriodEnd && periodEnd && (
            <Row
              label="Access until"
              value={periodEnd}
              valueStyle={{ color: '#f0c040' }}
            />
          )}

          {/* Upgrade prompt for free users */}
          {!is_pro && (
            <div style={{ marginTop: 4 }}>
              <Link href="/pricing" style={{
                display: 'inline-block', padding: '10px 20px', background: C.gold, borderRadius: 6,
                fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700,
                color: '#0d0d0d', textDecoration: 'none', letterSpacing: '0.04em',
              }}>
                Upgrade to Pro →
              </Link>
            </div>
          )}

          {/* Cancel button — only for active paid subscriptions */}
          {is_pro && has_subscription && !isCancelledAtPeriodEnd && !is_trial && (
            <div style={{ marginTop: 8 }}>
              {cancelDone ? (
                <div style={{ fontSize: 11, color: '#f0c040', fontFamily: 'monospace' }}>
                  Cancellation scheduled — you keep Pro until {periodEnd}.
                </div>
              ) : (
                <>
                  <button onClick={cancelSubscription} disabled={cancelling} style={{
                    padding: '8px 16px', background: 'transparent', border: '1px solid #3a1a1a',
                    borderRadius: 6, fontFamily: 'monospace', fontSize: 11,
                    color: '#c87070', cursor: cancelling ? 'not-allowed' : 'pointer', letterSpacing: '0.06em',
                  }}>
                    {cancelling ? 'Cancelling…' : 'Cancel Subscription'}
                  </button>
                  {cancelError && <div style={{ fontSize: 11, color: C.error, marginTop: 8 }}>{cancelError}</div>}
                </>
              )}
            </div>
          )}
          {isCancelledAtPeriodEnd && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#f0c040' }}>
              Subscription cancelled — access continues until {periodEnd}.
            </div>
          )}
        </Section>

        {/* Referral section */}
        <Section title="Refer & Earn">
          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>
            Share your referral link. Every new user who signs up gets 2 weeks of Pro free.
            When <strong style={{ color: C.text }}>5 referrals</strong> convert to paid, you earn{' '}
            <strong style={{ color: C.gold }}>1 year of Pro free</strong>.
          </p>

          {/* Referral code display */}
          <div style={{ background: C.goldLight, border: `1px solid ${C.goldBorder}`, borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: C.gold, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Your Referral Code
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.gold, letterSpacing: '0.12em', fontFamily: 'monospace' }}>
              {referral_code || '—'}
            </div>
          </div>

          {/* Shareable link */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Shareable Link
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                flex: 1, fontSize: 11, color: C.muted, background: '#080808',
                border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 12px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {shareLink}
              </div>
              <button onClick={copyCode} style={{
                padding: '9px 16px', background: copied ? 'rgba(129,199,132,0.15)' : 'transparent',
                border: `1px solid ${copied ? 'rgba(129,199,132,0.4)' : C.border}`, borderRadius: 6,
                fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: copied ? C.success : C.muted, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div style={{ background: '#080808', border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Total signups</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.text }}>{referral_count}</div>
            </div>
            <div style={{ background: '#080808', border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Converted to paid</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.gold }}>{paid_referral_count}</div>
            </div>
          </div>

          {/* Progress toward reward */}
          {referral_reward_applied ? (
            <div style={{ background: 'rgba(129,199,132,0.08)', border: '1px solid rgba(129,199,132,0.3)', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>🏆</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.success, marginBottom: 2 }}>Reward earned!</div>
                <div style={{ fontSize: 11, color: C.muted }}>1 year of Pro has been applied to your account.</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: C.dim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Progress to reward</span>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{paid_referral_count} / {REWARD_THRESHOLD} paid referrals</span>
              </div>
              <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: C.gold, borderRadius: 3, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 8 }}>
                {REWARD_THRESHOLD - paid_referral_count > 0
                  ? `${REWARD_THRESHOLD - paid_referral_count} more paid referral${REWARD_THRESHOLD - paid_referral_count === 1 ? '' : 's'} to earn 1 year of Pro free`
                  : 'Reward threshold reached!'}
              </div>
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}
