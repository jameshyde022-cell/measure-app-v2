{/* TODO: review business/legal details (entity name, address, governing law) before launch */}
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — MEASURE',
  description: 'Privacy Policy for MEASURE, the listing image tool for clothing resellers.',
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
const li = { fontSize: 14, color: C.muted, lineHeight: 1.75, marginBottom: 8 }

export default function PrivacyPage() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh' }}>
      <div style={wrap}>
        <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.gold, textDecoration: 'none', letterSpacing: '0.06em' }}>
          MEASURE
        </Link>

        <h1 style={h1}>Privacy Policy</h1>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 40 }}>Last updated: July 19, 2026</p>

        <p style={p}>
          This Privacy Policy explains what information MEASURE ("we", "us") collects when you use the
          Service, how we use it, and the choices you have. By using MEASURE, you agree to the collection
          and use of information as described here.
        </p>

        <h2 style={h2}>1. Information We Collect</h2>
        <ul style={{ margin: '0 0 14px 20px' }}>
          <li style={li}>Account information: your email address and other profile details you provide.</li>
          <li style={li}>Uploaded content: garment photos you upload, and generated images (e.g. ghost mannequin or model-style images).</li>
          <li style={li}>Measurement data: measurement lines, labels, values, item names, and notes you create.</li>
          <li style={li}>Usage data: how you interact with the Service, such as exports performed and pages visited.</li>
          <li style={li}>Referral data: referral codes, referral links, and information about who was referred, if you participate in the referral program.</li>
          <li style={li}>Payment-related data: subscription status and billing history, handled through Stripe (see "Payment Processing" below).</li>
        </ul>

        <h2 style={h2}>2. How We Process Uploaded Images</h2>
        <p style={p}>
          When you use features like background removal, ghost mannequin generation, or model-style image
          generation, your uploaded photo is sent to Google's Gemini AI service for processing. If you use
          AI-assisted listing text generation, relevant content is sent to Anthropic to generate that text.
          These providers process the content to return the requested output and are subject to their own
          privacy and data-handling terms.
        </p>

        <h2 style={h2}>3. How We Store Data</h2>
        <p style={p}>
          Uploaded and generated images are stored using Supabase Storage. Account information, measurement
          data, and other structured data are stored in our Supabase database.
        </p>

        <h2 style={h2}>4. Payment Processing</h2>
        <p style={p}>
          Subscription payments are processed by Stripe. MEASURE does not store your full payment card
          details — Stripe handles collection and storage of that information in accordance with its own
          security standards and privacy policy.
        </p>

        <h2 style={h2}>5. Cookies and Authentication</h2>
        <p style={p}>
          We use cookies or similar session tokens to keep you signed in and to secure your account. These
          are used only for authentication and core functionality of the Service.
        </p>

        <h2 style={h2}>6. Analytics</h2>
        <p style={p}>
          We use Vercel Analytics to understand aggregate usage of the Service. This analytics is
          privacy-conscious, does not use tracking cookies, and does not involve the sale of your personal
          data to third parties.
        </p>

        <h2 style={h2}>7. Data Retention</h2>
        <p style={p}>
          We retain your account information, uploaded images, and measurement data for as long as your
          account is active, or as needed to provide the Service to you. If you request deletion of your
          account or content, we will remove it within a reasonable time, except where retention is required
          for legal, tax, or fraud-prevention purposes.
        </p>

        <h2 style={h2}>8. Your Rights</h2>
        <p style={p}>
          You may request access to, or deletion of, your personal data and uploaded content at any time.
          Because there is currently no self-serve deletion option in the app, please email{' '}
          <a href="mailto:jameshyde022@gmail.com" style={{ color: C.gold, textDecoration: 'none' }}>jameshyde022@gmail.com</a>{' '}
          to request access to or deletion of your data.
        </p>

        <h2 style={h2}>9. Children's Privacy</h2>
        <p style={p}>
          MEASURE is not intended for, and should not be used by, children under 13 years of age. We do not
          knowingly collect personal information from children under 13.
        </p>

        <h2 style={h2}>10. Changes to This Policy</h2>
        <p style={p}>
          We may update this Privacy Policy from time to time. Continued use of the Service after changes
          take effect constitutes acceptance of the revised policy.
        </p>

        <h2 style={h2}>11. Contact</h2>
        <p style={p}>
          Questions about this Privacy Policy can be sent to{' '}
          <a href="mailto:jameshyde022@gmail.com" style={{ color: C.gold, textDecoration: 'none' }}>jameshyde022@gmail.com</a>.
        </p>
      </div>
    </div>
  )
}
