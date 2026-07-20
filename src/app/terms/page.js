{/* TODO: review business/legal details (entity name, address, governing law) before launch */}
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — MEASURE',
  description: 'Terms of Service for MEASURE, the listing image tool for clothing resellers.',
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

export default function TermsPage() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh' }}>
      <div style={wrap}>
        <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.gold, textDecoration: 'none', letterSpacing: '0.06em' }}>
          MEASURE
        </Link>

        <h1 style={h1}>Terms of Service</h1>
        <p style={{ fontSize: 12, color: C.dim, marginBottom: 40 }}>Last updated: July 19, 2026</p>

        <p style={p}>
          These Terms of Service ("Terms") govern your access to and use of MEASURE (the "Service"), a garment
          measurement and photo annotation tool that helps clothing resellers create listing-ready product images.
          By creating an account or using the Service, you agree to these Terms.
        </p>

        <h2 style={h2}>1. Description of the Service</h2>
        <p style={p}>
          MEASURE allows users to upload photos of garments, optionally generate cleaned-up or "ghost mannequin"
          style images, draw measurement lines and labels on those images, add item names and notes, and export
          the resulting image (typically for use in an online marketplace listing on platforms such as eBay,
          Etsy, Poshmark, Depop, or Mercari).
        </p>

        <h2 style={h2}>2. Accounts</h2>
        <p style={p}>
          To use most features of the Service, you must create an account. You agree to provide accurate
          information when registering and to keep your login credentials secure. You are responsible for all
          activity that occurs under your account.
        </p>

        <h2 style={h2}>3. Acceptable Use</h2>
        <p style={p}>You agree not to:</p>
        <ul style={{ margin: '0 0 14px 20px' }}>
          <li style={li}>Upload images you do not have the right to use.</li>
          <li style={li}>Use the Service to create misleading, fraudulent, or deceptive listings.</li>
          <li style={li}>Attempt to interfere with, disrupt, or gain unauthorized access to the Service or its underlying systems.</li>
          <li style={li}>Use the Service in violation of any applicable law.</li>
          <li style={li}>Circumvent export limits, watermarking, or other restrictions tied to the free or paid plans.</li>
        </ul>

        <h2 style={h2}>4. Subscriptions and Billing</h2>
        <p style={p}>
          MEASURE offers a free plan with a limited number of watermarked exports per day, and a paid "Pro"
          subscription (billed monthly or yearly) that removes the watermark and increases export limits.
          Paid subscriptions are billed on a recurring basis through our payment processor, Stripe.
        </p>
        <p style={p}>
          You may cancel your subscription at any time from your account page. Cancellation stops future
          billing but takes effect at the end of your current billing period — you will retain Pro access
          until that period ends. For details on refunds, see our{' '}
          <Link href="/refund-policy" style={{ color: C.gold, textDecoration: 'none' }}>Refund Policy</Link>.
        </p>

        <h2 style={h2}>5. Your Content</h2>
        <p style={p}>
          You retain ownership of the photos, measurements, notes, and other content you upload to MEASURE
          ("Your Content"). By uploading Your Content, you grant MEASURE a limited license to store, process,
          and display Your Content solely for the purpose of providing and improving the Service to you,
          including sending images to third-party AI providers as described below.
        </p>

        <h2 style={h2}>6. Third-Party AI Services</h2>
        <p style={p}>
          To provide features like background removal, ghost mannequin generation, and AI-assisted listing
          text, MEASURE sends uploaded images and related content to third-party AI providers, including
          Google (Gemini) for image processing and Anthropic for AI-generated listing text. These providers
          process this content subject to their own terms and privacy policies. By using these features, you
          consent to this processing.
        </p>

        <h2 style={h2}>7. Measurement Accuracy Disclaimer</h2>
        <p style={p}>
          <strong style={{ color: C.text }}>MEASURE is a tool to help you annotate and present measurements — it does not measure garments for you
          and does not guarantee the accuracy of any measurement, label, or listing information you create or
          generate using the Service.</strong> You are solely responsible for physically measuring garments and
          for verifying the accuracy of all measurements, descriptions, and other listing information before
          publishing a listing or providing it to a buyer. MEASURE is not liable for any listing errors, buyer
          disputes, returns, chargebacks, or other losses arising from reliance on measurements or content
          created using the Service.
        </p>

        <h2 style={h2}>8. Termination</h2>
        <p style={p}>
          We may suspend or terminate your access to the Service if you violate these Terms or misuse the
          Service. You may stop using the Service and delete your account at any time by contacting us.
        </p>

        <h2 style={h2}>9. Disclaimer of Warranties</h2>
        <p style={p}>
          The Service is provided "as is" and "as available," without warranties of any kind, express or
          implied, including warranties of merchantability, fitness for a particular purpose, or
          non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that
          any generated image or measurement will be accurate or suitable for your purposes.
        </p>

        <h2 style={h2}>10. Limitation of Liability</h2>
        <p style={p}>
          To the maximum extent permitted by law, MEASURE and its operator will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of profits, sales,
          or data, arising out of or related to your use of the Service, even if advised of the possibility
          of such damages.
        </p>

        <h2 style={h2}>11. Governing Law</h2>
        <p style={p}>
          These Terms are governed by the laws of the United States, without regard to conflict-of-law
          principles, to the extent applicable to an individually operated online service.
        </p>

        <h2 style={h2}>12. Changes to These Terms</h2>
        <p style={p}>
          We may update these Terms from time to time. Continued use of the Service after changes take
          effect constitutes acceptance of the revised Terms.
        </p>

        <h2 style={h2}>13. Contact</h2>
        <p style={p}>
          Questions about these Terms can be sent to{' '}
          <a href="mailto:jameshyde022@gmail.com" style={{ color: C.gold, textDecoration: 'none' }}>jameshyde022@gmail.com</a>.
        </p>
      </div>
    </div>
  )
}
