import React, { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_URL || ''

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || `HTTP ${r.status}`)
  return d
}

function CaseCard({ c, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ result: c.result || '', solution: c.solution || '' })
  const [loading, setLoading] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const doAction = async (path, label) => {
    setLoading(label)
    try {
      await api('POST', path)
      onRefresh()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(null)
    }
  }

  const saveEdit = async () => {
    setLoading('save')
    try {
      await api('PUT', `/api/admin/portfolio/${c.id}`, form)
      setEditing(false)
      onRefresh()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(null)
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'var(--text-primary)',
    fontSize: 12,
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
    outline: 'none',
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${c.status === 'published' ? 'rgba(212,175,55,0.25)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: 18,
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
            {c.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 3 }}>{c.service}</div>
        </div>
        <span style={{
          background: c.status === 'published' ? 'var(--gold-dim)' : 'rgba(255,255,255,0.04)',
          color: c.status === 'published' ? 'var(--gold)' : 'var(--text-muted)',
          border: `1px solid ${c.status === 'published' ? 'var(--border-gold)' : 'var(--border)'}`,
          borderRadius: 20, padding: '3px 10px', fontSize: 10, textTransform: 'uppercase', fontWeight: 600,
        }}>{c.status}</span>
      </div>

      {editing ? (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Результат</div>
            <textarea value={form.result} onChange={e => set('result', e.target.value)} rows={3} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Решение</div>
            <textarea value={form.solution} onChange={e => set('solution', e.target.value)} rows={3} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={saveEdit} disabled={!!loading} style={{
              background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', borderRadius: 6,
              padding: '6px 14px', color: 'var(--gold)', fontSize: 11, cursor: 'pointer', fontWeight: 600,
            }}>{loading === 'save' ? '...' : '✓ Сохранить'}</button>
            <button onClick={() => setEditing(false)} style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              padding: '6px 12px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
            }}>Отмена</button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
          <div><b>Проблема:</b> {c.problem || '—'}</div>
          <div><b>Результат:</b> <span style={{ color: c.result?.includes('будет обновлён') ? 'var(--orange)' : 'var(--text-muted)' }}>{c.result || '—'}</span></div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {c.status === 'draft' && (
          <button onClick={() => doAction(`/api/admin/portfolio/${c.id}/publish`, 'pub')} disabled={!!loading} style={{
            background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', borderRadius: 8,
            padding: '6px 14px', color: 'var(--gold)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>{loading === 'pub' ? '...' : '🌐 Publish'}</button>
        )}
        {c.status === 'published' && (
          <button onClick={() => doAction(`/api/admin/portfolio/${c.id}/unpublish`, 'unpub')} disabled={!!loading} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 14px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
          }}>{loading === 'unpub' ? '...' : '⤵ Unpublish'}</button>
        )}
        <button onClick={() => setEditing(!editing)} style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: 8,
          padding: '6px 12px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
        }}>✎ Edit</button>
      </div>
    </div>
  )
}

function TestimonialCard({ t, onRefresh }) {
  const [loading, setLoading] = useState(null)

  const doAction = async (path, label) => {
    setLoading(label)
    try { await api('POST', path); onRefresh() } catch (e) { alert(e.message) } finally { setLoading(null) }
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${t.status === 'published' ? 'rgba(212,175,55,0.25)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: 16,
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{t.client_name}</span>
        <span style={{
          background: t.status === 'published' ? 'var(--gold-dim)' : 'rgba(255,255,255,0.04)',
          color: t.status === 'published' ? 'var(--gold)' : 'var(--text-muted)',
          border: `1px solid ${t.status === 'published' ? 'var(--border-gold)' : 'var(--border)'}`,
          borderRadius: 20, padding: '2px 8px', fontSize: 10, textTransform: 'uppercase',
        }}>{t.status}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>
        "{t.text}"
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {t.status === 'draft' && (
          <button onClick={() => doAction(`/api/admin/testimonials/${t.id}/publish`, 'pub')} disabled={!!loading} style={{
            background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', borderRadius: 6,
            padding: '5px 12px', color: 'var(--gold)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>{loading === 'pub' ? '...' : '🌐 Publish'}</button>
        )}
        {t.status === 'published' && (
          <button onClick={() => doAction(`/api/admin/testimonials/${t.id}/unpublish`, 'unpub')} disabled={!!loading} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 6,
            padding: '5px 12px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
          }}>{loading === 'unpub' ? '...' : '⤵ Unpublish'}</button>
        )}
      </div>
    </div>
  )
}

function AddTestimonialForm({ onAdded }) {
  const [form, setForm] = useState({ client_name: '', text: '', rating: 5, service: '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inputStyle = {
    width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 12,
    fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  }

  const handleAdd = async () => {
    if (!form.client_name.trim() || !form.text.trim()) return
    setLoading(true)
    try {
      await api('POST', '/api/admin/testimonials', form)
      setForm({ client_name: '', text: '', rating: 5, service: '' })
      onAdded()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Добавить отзыв вручную
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Имя клиента" style={inputStyle} />
        <textarea value={form.text} onChange={e => set('text', e.target.value)} placeholder="Текст отзыва" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={form.service} onChange={e => set('service', e.target.value)} placeholder="Услуга" style={{ ...inputStyle, flex: 1 }} />
          <select value={form.rating} onChange={e => set('rating', parseInt(e.target.value))} style={{ ...inputStyle, width: 80, cursor: 'pointer' }}>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}★</option>)}
          </select>
        </div>
        <button onClick={handleAdd} disabled={loading} style={{
          background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', borderRadius: 6,
          padding: '8px', color: 'var(--gold)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>{loading ? '...' : '+ Добавить'}</button>
      </div>
    </div>
  )
}

export default function Portfolio() {
  const [cases, setCases] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [tab, setTab] = useState('portfolio')

  const loadCases = async () => {
    try { setCases(await api('GET', '/api/admin/portfolio')) } catch {}
  }
  const loadTestimonials = async () => {
    try { setTestimonials(await api('GET', '/api/admin/testimonials')) } catch {}
  }

  useEffect(() => { loadCases(); loadTestimonials() }, [])

  const publishedCases = cases.filter(c => c.status === 'published')
  const draftCases = cases.filter(c => c.status === 'draft')
  const publishedT = testimonials.filter(t => t.status === 'published')
  const draftT = testimonials.filter(t => t.status === 'draft')

  return (
    <div style={{ maxWidth: 900, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', margin: 0 }}>
          Portfolio & Testimonials
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0' }}>
          Управление кейсами и отзывами для Mini App
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Published Cases', value: publishedCases.length, color: 'var(--gold)' },
          { label: 'Draft Cases', value: draftCases.length, color: 'var(--text-muted)' },
          { label: 'Published Reviews', value: publishedT.length, color: 'var(--green)' },
          { label: 'Draft Reviews', value: draftT.length, color: 'var(--text-muted)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'Space Grotesk' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { key: 'portfolio', label: `💼 Portfolio (${cases.length})` },
          { key: 'testimonials', label: `⭐ Testimonials (${testimonials.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '7px 16px',
            borderRadius: 20,
            border: tab === key ? '1px solid var(--border-gold)' : '1px solid var(--border)',
            background: tab === key ? 'var(--gold-dim)' : 'transparent',
            color: tab === key ? 'var(--gold)' : 'var(--text-muted)',
            fontSize: 12, cursor: 'pointer', fontWeight: tab === key ? 600 : 400,
          }}>{label}</button>
        ))}
      </div>

      {tab === 'portfolio' && (
        <div>
          {cases.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💼</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Кейсы появятся после первых закрытых сделок.<br />
                Approve → Mark Won → Generate Portfolio Case
              </div>
            </div>
          ) : (
            cases.map(c => <CaseCard key={c.id} c={c} onRefresh={loadCases} />)
          )}
        </div>
      )}

      {tab === 'testimonials' && (
        <div>
          <AddTestimonialForm onAdded={loadTestimonials} />
          {testimonials.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⭐</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Отзывов пока нет. Добавьте вручную или дождитесь закрытых сделок.
              </div>
            </div>
          ) : (
            testimonials.map(t => <TestimonialCard key={t.id} t={t} onRefresh={loadTestimonials} />)
          )}
        </div>
      )}
    </div>
  )
}
