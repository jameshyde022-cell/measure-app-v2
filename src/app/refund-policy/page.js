{/* TODO: confirm refund policy — currently defaults to "no partial refunds, case-by-case support" */}
import Link from 'next/link'

export const metadata = {
  title: 'Refund Policy — MEASURE',
  description: 'Refund and cancellation policy for MEASURE Pro subscriptions.',
}

const C = {
  bg: '#0d0d0d',
  gold: '#e8b84b',
  text: '#f0ebe0',
  muted: '#999999',
  dim: '#555555',
}

const wrap = { maxWidth: 760, margin: '0 auto', padding: '60px 24px 80px' }
const h1 = { fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, color: C.text, margin: '32px 0 8px' }
const h2 = { fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.text, marginTop: 36, marginBottom: 10 }
const p = { fontSize: 14, color: C.muted, lineHeight: 1.75, marginBottom: 14 }

export default function RefundPolicyPage() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh' }}>
      <div style={wrap}>
        <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.gold, textDecoration: 'none', letterSpacing: '0.06em' }}>
          MEASURE
        </Link>

        <h1 style={h1}>Refund Policy</h1>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 40 }}>Last updated: July 19, 2026</p>

        <h2 style={h2}>1. Subscription Billing</h2>
        <p style={p}>
          MEASURE Pro is billed on a recurring basis, either monthly or yearly, through our payment
          processor, Stripe. Your subscription automatically renews at the end of each billing period unless
          you cancel.
        </p>

        <h2 style={h2}>2. Cancellation</h2>
        <p style={p}>
          You can cancel your subscription at any time from your account page. When you cancel, you keep
          full Pro access for the rest of your current billing period — your access does not end
          immediately. No new charge will occur after that period ends.
        </p>

        <h2 style={h2}>3. Refunds</h2>
        <p style={p}>
          We do not offer refunds for the unused portion of a billing period after cancellation. If you
          believe you were charged in error, or have another billing issue, please contact us — billing
          issues are reviewed and handled on a case-by-case basis.
        </p>

        <h2 style={h2}>4. Free Plan</h2>
        <p style={p}>
          The free plan does not require payment and includes a limited number of watermarked exports per
          day. No billing or refund terms apply to the free plan.
        </p>

        <h2 style={h2}>5. Contact</h2>
        <p style={p}>
          For billing questions or to report an issue with a charge, email{' '}
          <a href="mailto:jameshyde022@gmail.com" style={{ color: C.gold, textDecoration: 'none' }}>jameshyde022@gmail.com</a>.
        </p>
      </div>
    </div>
  )
}
