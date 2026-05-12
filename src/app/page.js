import Link from 'next/link'
import Image from 'next/image'
import fs from 'fs'
import path from 'path'
import styles from './landing.module.css'

const C = {
  bg: '#0d0d0d',
  surface: '#111111',
  card: '#131313',
  border: '#1e1e1e',
  gold: '#e8b84b',
  goldLight: 'rgba(232,184,75,0.10)',
  text: '#f0ebe0',
  muted: '#888888',
  dim: '#444444',
}

function Section({ children, id, bg, style = {} }) {
  return (
    <section id={id} style={{ padding: '80px 0', background: bg, ...style }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        {children}
      </div>
    </section>
  )
}

function Tag({ children }) {
  return (
    <span style={{
      display: 'inline-block',
      background: C.goldLight,
      color: C.gold,
      fontSize: 11,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      padding: '4px 12px',
      borderRadius: 20,
      border: 'rgba(232,184,75,0.25) solid 1px',
      marginBottom: 16,
    }}>
      {children}
    </span>
  )
}

function Heading({ children, size = 'lg', center = false }) {
  const sizes = {
    xl: { fontSize: 'clamp(36px, 6vw, 56px)', lineHeight: 1.1 },
    lg: { fontSize: 'clamp(26px, 4vw, 38px)', lineHeight: 1.2 },
    md: { fontSize: 24, lineHeight: 1.3 },
  }
  return (
    <h2 style={{
      fontFamily: "'Playfair Display', serif",
      fontWeight: 700,
      color: C.text,
      textAlign: center ? 'center' : 'left',
      marginBottom: 16,
      ...sizes[size],
    }}>
      {children}
    </h2>
  )
}

// ── NAV ───────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className={styles.nav}>
      <Link href="/" style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 20,
        fontWeight: 700,
        color: C.gold,
        textDecoration: 'none',
        letterSpacing: '0.06em',
      }}>
        MEASURE
      </Link>
      <div className={styles.navLinks}>
        <a href="#features" className={styles.navLink}>Features</a>
        <a href="#examples" className={styles.navLink}>Examples</a>
        <a href="#pricing" className={styles.navLink}>Pricing</a>
        <Link href="/app" className={styles.navCta}>Try Free</Link>
      </div>
    </nav>
  )
}

// ── HERO ──────────────────────────────────────────────────────────────────────

function HeroImage({ src, alt, accent = false }) {
  return (
    <div style={{
      flex: 1,
      position: 'relative',
      minHeight: 320,
      borderRadius: 14,
      overflow: 'hidden',
      border: `1px solid ${accent ? 'rgba(232,184,75,0.28)' : C.border}`,
    }}>
      <Image
        src={src}
        alt={alt}
        fill
        style={{ objectFit: 'contain' }}
        sizes="(max-width: 768px) 100vw, 45vw"
        priority
      />
    </div>
  )
}

function Hero() {
  return (
    <section style={{ padding: '100px 0 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ maxWidth: 680 }}>
          <Tag>For clothing resellers</Tag>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(38px, 6vw, 64px)',
            fontWeight: 700,
            lineHeight: 1.1,
            color: C.text,
            marginBottom: 24,
          }}>
            Create cleaner clothing listings in minutes.
          </h1>
          <p style={{ fontSize: 18, color: C.muted, lineHeight: 1.75, marginBottom: 12 }}>
            MEASURE helps clothing resellers turn basic garment photos into polished listing images with ghost mannequin styling, model images, and easy measurement annotations.
          </p>
          <p style={{ fontSize: 13, color: C.dim, marginBottom: 36 }}>
            Built for eBay, Poshmark, Etsy, Depop, Mercari, vintage sellers, consignment shops, and online clothing stores.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/app" className={styles.btnPrimary}>
              Try Free — 3 Exports Included
            </Link>
            <a href="#how-it-works" className={styles.btnSecondary}>
              View How It Works
            </a>
          </div>
          <p style={{ fontSize: 12, color: C.dim, marginTop: 14 }}>
            No credit card required for free exports.
          </p>
        </div>

        <div className={styles.heroVisual}>
          <HeroImage src="/before.jpg" alt="Before: basic garment photo" />
          <div className={styles.heroArrow} aria-hidden="true">→</div>
          <HeroImage src="/after.png" alt="After: listing-ready image with measurements" accent />
        </div>
      </div>
    </section>
  )
}

// ── PROBLEM ───────────────────────────────────────────────────────────────────

function Problem() {
  const pains = [
    {
      icon: '📸',
      title: 'Messy flat-lay photos',
      body: 'Raw garment photos are often uneven, shadow-heavy, and hard to clean up without design tools.',
    },
    {
      icon: '📐',
      title: 'Time-consuming measurement graphics',
      body: 'Creating annotated measurement images by hand is slow, inconsistent, and breaks your listing workflow.',
    },
    {
      icon: '❓',
      title: 'Listings that do not clearly show fit',
      body: 'Buyers skip listings when they cannot visualize fit. Clear measurement details make listings easier to understand.',
    },
  ]

  return (
    <Section bg={C.surface}>
      <Heading center>
        Listing clothing should not require messy photos and manual design work.
      </Heading>
      <p style={{
        fontSize: 16,
        color: C.muted,
        textAlign: 'center',
        maxWidth: 580,
        margin: '0 auto 48px',
        lineHeight: 1.75,
      }}>
        Most clothing sellers waste time cleaning photos, making measurement graphics, or answering buyer questions about fit. MEASURE gives you one simple workflow for creating cleaner listing images faster.
      </p>
      <div className={styles.threeGrid}>
        {pains.map((p, i) => (
          <div key={i} style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 28,
          }}>
            <div style={{ fontSize: 28, marginBottom: 14 }}>{p.icon}</div>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: 8, fontSize: 15 }}>{p.title}</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{p.body}</div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── HOW IT WORKS ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Upload your garment photo',
      body: 'Start with any photo you already have of the garment — flat lay, hanger, or otherwise.',
    },
    {
      n: '02',
      title: 'Generate a cleaner image',
      body: 'Use ghost mannequin or model-style generation to create a polished product visual from your photo.',
    },
    {
      n: '03',
      title: 'Add measurement annotations',
      body: 'Click to place color-coded measurement lines with labels like waist, chest, inseam, shoulder, and more.',
    },
    {
      n: '04',
      title: 'Export your listing image',
      body: 'Download a clean, ready-to-upload image for your eBay, Poshmark, Etsy, or other listing.',
    },
  ]

  return (
    <Section id="how-it-works">
      <Tag>Simple workflow</Tag>
      <Heading>From garment photo to listing image.</Heading>
      <div className={styles.fourGrid} style={{ marginTop: 48 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 28,
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.gold,
              letterSpacing: '0.12em',
              marginBottom: 18,
              fontFamily: 'monospace',
            }}>
              {s.n}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>{s.title}</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{s.body}</div>
          </div>
        ))}
      </div>

      <div style={{
        position: 'relative',
        maxWidth: 800,
        margin: '56px auto 0',
        borderRadius: 12,
        overflow: 'hidden',
        aspectRatio: '16/9',
      }}>
        <iframe
          src="https://www.youtube.com/embed/MNDVm67l7Uo"
          title="MEASURE — How It Works"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>
    </Section>
  )
}

// ── FEATURES ──────────────────────────────────────────────────────────────────

const featureList = [
  {
    icon: '👗',
    title: 'Ghost mannequin images',
    body: 'Turn decent garment photos into cleaner product-style images without a model or mannequin.',
  },
  {
    icon: '🧍',
    title: 'AI model images',
    body: 'Create model-style visuals for apparel listings using AI generation.',
  },
  {
    icon: '🖼️',
    title: 'Background cleanup',
    body: 'Remove distracting backgrounds from garment photos to create clean, professional product shots.',
  },
  {
    icon: '📏',
    title: 'Measurement annotations',
    body: 'Add color-coded lines for waist, inseam, rise, hip, chest, sleeve, shoulder, length, and more.',
  },
  {
    icon: '⬇️',
    title: 'Clean export',
    body: 'Export a polished image ready to upload directly to your listing on any platform.',
  },
  {
    icon: '🏷️',
    title: 'Built for resellers',
    body: 'Designed for sellers who list clothing regularly and need a faster, more consistent workflow.',
  },
]

function Features() {
  return (
    <Section id="features" bg={C.surface}>
      <Tag>Features</Tag>
      <Heading>Everything you need to finish clothing listing images.</Heading>
      <div className={styles.threeGrid} style={{ marginTop: 48 }}>
        {featureList.map((f, i) => (
          <div key={i} style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 28,
          }}>
            <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>{f.title}</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{f.body}</div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── EXAMPLES ──────────────────────────────────────────────────────────────────

const LABEL_BASE = {
  position: 'absolute',
  top: 12,
  left: 12,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  padding: '5px 12px',
  borderRadius: 5,
  zIndex: 2,
  lineHeight: 1,
}

function BeforeAfterPair({ before, after, beforeExt = 'jpg' }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'stretch',
    }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'relative', aspectRatio: '3/4', background: '#0f0f0f' }}>
          <Image
            src={before}
            alt="Before"
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 50vw, 17vw"
          />
        </div>
        <div style={{
          ...LABEL_BASE,
          background: 'rgba(0,0,0,0.78)',
          color: '#ffffff',
          border: '1px solid rgba(255,255,255,0.18)',
        }}>
          Before
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 8px',
        color: C.gold,
        fontSize: 20,
        fontWeight: 700,
        flexShrink: 0,
      }}>
        →
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{
          position: 'relative',
          aspectRatio: '3/4',
          background: '#111111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Image
            src={after}
            alt="After"
            fill
            style={{ objectFit: 'contain' }}
            sizes="(max-width: 768px) 50vw, 17vw"
          />
        </div>
        <div style={{
          ...LABEL_BASE,
          background: 'rgba(232,184,75,0.22)',
          color: C.gold,
          border: '1px solid rgba(232,184,75,0.45)',
        }}>
          After
        </div>
      </div>
    </div>
  )
}

const GALLERY_COUNT = 20

function Gallery() {
  const galleryDir = path.join(process.cwd(), 'public', 'gallery')
  const existing = new Set(
    fs.existsSync(galleryDir) ? fs.readdirSync(galleryDir) : []
  )

  const slots = Array.from({ length: GALLERY_COUNT }, (_, i) => {
    const filename = `gallery-${i + 1}.jpg`
    return { src: `/gallery/${filename}`, exists: existing.has(filename), n: i + 1 }
  })

  return (
    <Section bg={C.surface}>
      <Heading center>See what MEASURE creates</Heading>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
        marginTop: 40,
      }}>
        {slots.map((slot) => (
          <div key={slot.n} style={{
            position: 'relative',
            aspectRatio: '3/4',
            borderRadius: 10,
            overflow: 'hidden',
            background: C.card,
            border: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {slot.exists ? (
              <Image
                src={slot.src}
                alt={`Gallery image ${slot.n}`}
                fill
                style={{ objectFit: 'contain' }}
                sizes="(max-width: 768px) 50vw, 200px"
              />
            ) : (
              <div style={{
                fontSize: 11,
                color: C.dim,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                userSelect: 'none',
              }}>
                {slot.n}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

function Examples() {
  const pairs = [
    { before: '/examples/before-1.jpg', after: '/examples/after-1.png' },
    { before: '/examples/before-2.jpg', after: '/examples/after-2.png' },
    { before: '/examples/before-3.jpg', after: '/examples/after-3.png' },
  ]

  return (
    <>
      <Section id="examples">
        <p style={{
          fontSize: 'clamp(18px, 3vw, 26px)',
          color: C.text,
          lineHeight: 1.55,
          maxWidth: 760,
          fontFamily: "'Playfair Display', serif",
          fontWeight: 600,
          margin: 0,
        }}>
          Let MEASURE turn your raw photo into a beautiful, professional presentation that sets your listings apart.
        </p>
        <div className={styles.threeGrid} style={{ marginTop: 48 }}>
          {pairs.map((p, i) => (
            <BeforeAfterPair key={i} {...p} />
          ))}
        </div>
      </Section>
      <Gallery />
    </>
  )
}

// ── PRICING ───────────────────────────────────────────────────────────────────

function PricingCard({ plan }) {
  return (
    <div style={{
      background: plan.highlight ? 'rgba(232,184,75,0.06)' : C.card,
      border: `1px solid ${plan.highlight ? 'rgba(232,184,75,0.35)' : C.border}`,
      borderRadius: 14,
      padding: 32,
      position: 'relative',
    }}>
      {plan.badge && (
        <div style={{
          position: 'absolute',
          top: -13,
          left: '50%',
          transform: 'translateX(-50%)',
          background: C.gold,
          color: '#0d0d0d',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          padding: '4px 14px',
          borderRadius: 20,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {plan.badge}
        </div>
      )}
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: C.muted,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 18,
      }}>
        {plan.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 42,
          fontWeight: 700,
          color: C.text,
        }}>
          {plan.price}
        </span>
        <span style={{ fontSize: 14, color: C.muted }}>{plan.period}</span>
      </div>
      <ul style={{ listStyle: 'none', marginBottom: 28 }}>
        {plan.features.map((f, j) => (
          <li key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ color: C.gold, fontSize: 13, marginTop: 2, flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>{f}</span>
          </li>
        ))}
      </ul>
      <Link href={plan.href} style={{
        display: 'block',
        textAlign: 'center',
        background: plan.highlight ? C.gold : 'transparent',
        color: plan.highlight ? '#0d0d0d' : C.text,
        border: `1px solid ${plan.highlight ? C.gold : C.border}`,
        padding: '12px 20px',
        borderRadius: 8,
        textDecoration: 'none',
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: '0.04em',
        transition: 'opacity 0.2s',
      }}>
        {plan.cta}
      </Link>
    </div>
  )
}

function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '',
      badge: null,
      highlight: false,
      features: [
        '3 exports',
        'Up to 4 measurement lines per image',
        'Try core tools',
        'No credit card required',
      ],
      cta: 'Start Free',
      href: '/app',
    },
    {
      name: 'Pro Monthly',
      price: '$9.99',
      period: '/month',
      badge: null,
      highlight: false,
      features: [
        'Unlimited exports',
        'More measurement lines',
        'Ghost mannequin images',
        'AI model images',
        'Background cleanup',
        'Listing-ready exports',
      ],
      cta: 'Upgrade Monthly',
      // TODO: To deep-link to the monthly checkout, update href to '/pricing?plan=monthly'
      // and read the param inside /pricing/page.js to pre-select the right Stripe price ID.
      href: '/pricing',
    },
    {
      name: 'Pro Yearly',
      price: '$29.99',
      period: '/year',
      badge: 'Best Value',
      highlight: true,
      features: [
        'Everything in Pro Monthly',
        'Lower yearly cost',
        'Best for active clothing sellers',
      ],
      cta: 'Upgrade Yearly',
      // TODO: To deep-link to the yearly checkout, update href to '/pricing?plan=yearly'
      // and read the param inside /pricing/page.js to pre-select the right Stripe price ID.
      href: '/pricing',
    },
  ]

  return (
    <Section id="pricing" bg={C.surface}>
      <Tag>Pricing</Tag>
      <Heading center>Simple pricing for clothing sellers.</Heading>
      <div className={styles.pricingGrid} style={{ marginTop: 48 }}>
        {plans.map((plan, i) => (
          <PricingCard key={i} plan={plan} />
        ))}
      </div>
    </Section>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const faqItems = [
  {
    q: 'Who is MEASURE for?',
    a: 'MEASURE is built for clothing resellers, vintage sellers, consignment shops, and online apparel sellers who want cleaner listing images.',
  },
  {
    q: 'What platforms can I use the exported images on?',
    a: 'You can use exported images on platforms like eBay, Poshmark, Etsy, Depop, Mercari, Shopify, and other online stores.',
  },
  {
    q: 'Do I need design experience?',
    a: 'No. MEASURE is designed to be simple: upload a photo, generate an image, add measurements, and export.',
  },
  {
    q: 'What do I get for free?',
    a: 'The free plan includes 3 exports and up to 4 measurement lines per image.',
  },
  {
    q: 'Does MEASURE guarantee more sales?',
    a: 'No. MEASURE does not guarantee sales. It helps you create cleaner, clearer listing images that may make your listings easier for buyers to understand.',
  },
]

function FAQ() {
  return (
    <Section id="faq">
      <Tag>FAQ</Tag>
      <Heading>Common questions.</Heading>
      <div style={{ marginTop: 40, maxWidth: 720 }}>
        {faqItems.map((item, i) => (
          <details key={i} className={styles.faqItem}>
            <summary className={styles.faqSummary}>{item.q}</summary>
            <p className={styles.faqAnswer}>{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  )
}

// ── FINAL CTA ─────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <Section bg={C.surface} style={{ textAlign: 'center' }}>
      <Heading center size="lg">Ready to clean up your clothing listings?</Heading>
      <p style={{
        fontSize: 16,
        color: C.muted,
        maxWidth: 460,
        margin: '0 auto 36px',
        lineHeight: 1.75,
      }}>
        Try MEASURE with 3 free exports and see how it fits into your listing workflow.
      </p>
      <Link href="/app" className={styles.btnPrimary}>
        Start Free
      </Link>
    </Section>
  )
}

// ── FOOTER ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: '40px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <div className={styles.footerInner}>
          <div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              fontWeight: 700,
              color: C.gold,
              marginBottom: 8,
            }}>
              MEASURE
            </div>
            <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.65, maxWidth: 220 }}>
              Listing image tool for clothing resellers.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.dim,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}>
                Product
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a href="#features" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>Features</a>
                <a href="#pricing" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>Pricing</a>
                <Link href="/app" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>App</Link>
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 40, fontSize: 12, color: C.dim }}>
          © {new Date().getFullYear()} MEASURE. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

// ── PAGE ROOT ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh' }}>
      <Nav />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <Examples />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
