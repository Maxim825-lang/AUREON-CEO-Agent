import React, { useEffect, useState, useRef } from 'react'

const BASE = import.meta.env.VITE_API_URL || ''

async function apiFetch(path) {
  const r = await fetch(`${BASE}${path}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

async function apiPost(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || `HTTP ${r.status}`)
  return d
}

const COLORS = {
  bg: '#0A0A0B',
  surface: '#111113',
  card: '#16161A',
  border: 'rgba(255,255,255,0.08)',
  gold: '#D4AF37',
  goldDim: 'rgba(212,175,55,0.12)',
  goldBorder: 'rgba(212,175,55,0.3)',
  text: '#F5F5F5',
  muted: 'rgba(255,255,255,0.45)',
  green: '#10B981',
}

const SERVICE_ICONS = {
  'AI Telegram Bot': '🤖',
  'AI Content System': '📢',
  'Landing Page + AI Chat': '🌐',
  'Business Automation': '⚙️',
  'AUREON Mini HQ': '👑',
}

function StarRating({ rating = 5 }) {
  return (
    <span style={{ color: COLORS.gold, fontSize: 14 }}>
      {'★'.repeat(Math.min(rating, 5))}{'☆'.repeat(Math.max(0, 5 - rating))}
    </span>
  )
}

function Section({ id, children, style }) {
  return (
    <section id={id} style={{ padding: '28px 16px', ...style }}>
      {children}
    </section>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: COLORS.gold, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
        AUREON
      </div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.text, fontFamily: 'Space Grotesk, sans-serif' }}>
        {children}
      </h2>
    </div>
  )
}

function ServiceCard({ svc }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44,
          background: COLORS.goldDim,
          border: `1px solid ${COLORS.goldBorder}`,
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>
          {svc.icon || SERVICE_ICONS[svc.name] || '⚡'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{svc.name}</div>
          <div style={{ fontSize: 12, color: COLORS.gold, fontWeight: 600 }}>
            от ${svc.price_from?.toLocaleString()}
          </div>
        </div>
        <div style={{ fontSize: 11, color: COLORS.muted, textAlign: 'right' }}>
          {svc.timeline}
        </div>
      </div>
      <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5, marginBottom: 10 }}>
        {svc.description}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(svc.features || []).map((f, i) => (
          <span key={i} style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 20,
            padding: '3px 8px',
            fontSize: 11,
            color: COLORS.muted,
          }}>{f}</span>
        ))}
      </div>
    </div>
  )
}

function PortfolioCard({ c }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
    }}>
      <div style={{ fontSize: 9, color: COLORS.gold, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
        {c.service}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>{c.title}</div>
      {c.result && (
        <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5, marginBottom: 8 }}>
          {c.result}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {c.price && (
          <span style={{ fontSize: 12, color: COLORS.gold, fontWeight: 600 }}>${c.price?.toLocaleString()}</span>
        )}
        {c.duration && (
          <span style={{ fontSize: 12, color: COLORS.muted }}>{c.duration}</span>
        )}
      </div>
    </div>
  )
}

function TestimonialCard({ t }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
    }}>
      <div style={{ marginBottom: 8 }}>
        <StarRating rating={t.rating} />
      </div>
      <div style={{
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 1.6,
        fontStyle: 'italic',
        marginBottom: 12,
      }}>
        "{t.text}"
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.gold }}>{t.client_name}</span>
        {t.service && <span style={{ fontSize: 11, color: COLORS.muted }}>{t.service}</span>}
      </div>
    </div>
  )
}

const SERVICES_LIST = [
  'AI Telegram Bot',
  'AI Content System',
  'Landing Page + AI Chat',
  'Business Automation',
  'AUREON Mini HQ',
]

const BUDGET_OPTIONS = [
  'До $500',
  '$500 – $1000',
  '$1000 – $2000',
  '$2000 – $5000',
  '$5000+',
  'Обсудим',
]

function OrderForm({ onSuccess, tgUser }) {
  const [form, setForm] = useState({
    name: tgUser?.first_name || '',
    username: tgUser?.username || '',
    service: '',
    budget: '',
    deadline: '',
    project_description: '',
    contact: tgUser?.username ? `@${tgUser.username}` : '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: '12px 14px',
    color: COLORS.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.service) {
      setError('Заполните имя и выберите услугу')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await apiPost('/api/miniapp/purchase-request', {
        ...form,
        telegram_user_id: tgUser?.id?.toString(),
        telegram_chat_id: tgUser?.id?.toString(),
      })
      onSuccess()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>Ваше имя *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Как вас зовут?" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Telegram</label>
        <input value={form.username} onChange={e => set('username', e.target.value)}
          placeholder="@username" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Услуга *</label>
        <select value={form.service} onChange={e => set('service', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">Выберите услугу...</option>
          {SERVICES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Бюджет</label>
        <select value={form.budget} onChange={e => set('budget', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">Выберите бюджет...</option>
          {BUDGET_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Дедлайн</label>
        <input value={form.deadline} onChange={e => set('deadline', e.target.value)}
          placeholder="Например: 2 недели, конец июля..." style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Описание проекта</label>
        <textarea value={form.project_description} onChange={e => set('project_description', e.target.value)}
          placeholder="Расскажите о вашем проекте..."
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div>
        <label style={labelStyle}>Контакт для связи</label>
        <input value={form.contact} onChange={e => set('contact', e.target.value)}
          placeholder="@telegram или email" style={inputStyle} />
      </div>
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 13,
          color: '#F87171',
        }}>{error}</div>
      )}
      <button type="submit" disabled={loading} style={{
        background: loading ? 'rgba(212,175,55,0.3)' : 'linear-gradient(135deg, #D4AF37, #B8960C)',
        border: 'none',
        borderRadius: 12,
        padding: '14px',
        color: '#0A0A0B',
        fontSize: 15,
        fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'Space Grotesk, sans-serif',
      }}>
        {loading ? '⟳ Отправка...' : '✓ Отправить заявку'}
      </button>
    </form>
  )
}

export default function MiniApp() {
  const [services, setServices] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [tgUser, setTgUser] = useState(null)
  const orderRef = useRef(null)

  useEffect(() => {
    // Telegram WebApp init
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()
      if (tg.initDataUnsafe?.user) {
        setTgUser(tg.initDataUnsafe.user)
      }
    }
    // Load data
    apiFetch('/api/miniapp/services').then(setServices).catch(() => {})
    apiFetch('/api/miniapp/portfolio').then(setPortfolio).catch(() => {})
    apiFetch('/api/miniapp/testimonials').then(setTestimonials).catch(() => {})
  }, [])

  // Load Telegram WebApp script
  useEffect(() => {
    if (!document.getElementById('tg-webapp-script')) {
      const s = document.createElement('script')
      s.id = 'tg-webapp-script'
      s.src = 'https://telegram.org/js/telegram-web-app.js'
      document.head.appendChild(s)
    }
  }, [])

  const scrollToOrder = () => {
    orderRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const NAV = [
    { key: 'home', label: '🏠', title: 'Главная' },
    { key: 'services', label: '🛠', title: 'Услуги' },
    { key: 'portfolio', label: '💼', title: 'Работы' },
    { key: 'reviews', label: '⭐', title: 'Отзывы' },
    { key: 'order', label: '📝', title: 'Заявка' },
  ]

  return (
    <div style={{
      background: COLORS.bg,
      minHeight: '100vh',
      color: COLORS.text,
      fontFamily: 'Inter, system-ui, sans-serif',
      maxWidth: 480,
      margin: '0 auto',
      paddingBottom: 80,
    }}>
      {/* Hero */}
      <Section id="home" style={{ paddingTop: 48, textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72,
          background: 'linear-gradient(135deg, #D4AF37, #B8960C)',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 32,
          boxShadow: '0 0 40px rgba(212,175,55,0.3)',
        }}>A</div>
        <h1 style={{
          margin: '0 0 8px',
          fontSize: 32,
          fontWeight: 800,
          color: COLORS.gold,
          fontFamily: 'Space Grotesk, sans-serif',
          letterSpacing: '-0.02em',
        }}>AUREON</h1>
        <p style={{ margin: '0 0 24px', fontSize: 15, color: COLORS.muted, lineHeight: 1.5 }}>
          AI-боты и автоматизация<br />для вашего бизнеса
        </p>
        <button onClick={scrollToOrder} style={{
          background: 'linear-gradient(135deg, #D4AF37, #B8960C)',
          border: 'none',
          borderRadius: 14,
          padding: '14px 32px',
          color: '#0A0A0B',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'Space Grotesk, sans-serif',
          boxShadow: '0 4px 24px rgba(212,175,55,0.3)',
        }}>
          Оставить заявку
        </button>
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 24 }}>
          {[
            { v: '24/7', l: 'AI работает' },
            { v: '$300+', l: 'от' },
            { v: '7d+', l: 'срок' },
          ].map(({ v, l }) => (
            <div key={v} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.gold, fontFamily: 'Space Grotesk' }}>{v}</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Services */}
      <Section id="services">
        <SectionTitle>Услуги</SectionTitle>
        {services.length === 0 ? (
          <div style={{ color: COLORS.muted, textAlign: 'center', padding: '24px 0', fontSize: 14 }}>
            Загрузка...
          </div>
        ) : (
          services.map(s => <ServiceCard key={s.id} svc={s} />)
        )}
      </Section>

      {/* Portfolio */}
      <Section id="portfolio">
        <SectionTitle>Портфолио</SectionTitle>
        {portfolio.length === 0 ? (
          <div style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💼</div>
            <div style={{ fontSize: 15, color: COLORS.text, fontWeight: 600, marginBottom: 6 }}>
              Портфолио скоро появится
            </div>
            <div style={{ fontSize: 13, color: COLORS.muted }}>
              Мы работаем над первыми проектами — кейсы будут здесь после запуска
            </div>
          </div>
        ) : (
          portfolio.map(c => <PortfolioCard key={c.id} c={c} />)
        )}
      </Section>

      {/* Reviews */}
      <Section id="reviews">
        <SectionTitle>Отзывы</SectionTitle>
        {testimonials.length === 0 ? (
          <div style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⭐</div>
            <div style={{ fontSize: 15, color: COLORS.text, fontWeight: 600, marginBottom: 6 }}>
              Отзывы появятся после первых клиентов
            </div>
            <div style={{ fontSize: 13, color: COLORS.muted }}>
              Будьте первым — оставьте заявку и получите результат
            </div>
          </div>
        ) : (
          testimonials.map(t => <TestimonialCard key={t.id} t={t} />)
        )}
      </Section>

      {/* Order Form */}
      <Section id="order" style={{ paddingBottom: 40 }}>
        <div ref={orderRef}>
          <SectionTitle>Оставить заявку</SectionTitle>
          {submitted ? (
            <div style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.green, marginBottom: 8 }}>
                Заявка отправлена!
              </div>
              <div style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.6 }}>
                CEO AI проверит заявку и свяжется с вами в Telegram.
              </div>
            </div>
          ) : (
            <OrderForm onSuccess={() => setSubmitted(true)} tgUser={tgUser} />
          )}
        </div>
      </Section>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0',
        zIndex: 100,
      }}>
        {NAV.map(({ key, label, title }) => (
          <a key={key} href={`#${key}`} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            textDecoration: 'none',
            color: COLORS.muted,
            padding: '4px 8px',
          }}>
            <span style={{ fontSize: 18 }}>{label}</span>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
