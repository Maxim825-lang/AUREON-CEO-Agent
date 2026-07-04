import React, { useEffect, useState, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || ''

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const r = await fetch(`${API}${path}`, opts)
  if (!r.ok) {
    const data = await r.json().catch(() => null)
    const msg = (typeof data?.detail === 'string' ? data.detail : null) || `HTTP ${r.status}`
    throw new Error(msg)
  }
  return r.json()
}
const get = (path) => api('GET', path)
const post = (path, body) => api('POST', path, body)
const put = (path, body) => api('PUT', path, body)
const del = (path) => api('DELETE', path)

// ── Design tokens ────────────────────────────────────────────────────────────

const TYPE_META = {
  short:      { label: 'Short',      color: '#3B82F6', dim: 'rgba(59,130,246,0.1)',  icon: '⚡' },
  long:       { label: 'Long',       color: '#8B5CF6', dim: 'rgba(139,92,246,0.1)',  icon: '🗄' },
  knowledge:  { label: 'Knowledge',  color: '#D4AF37', dim: 'rgba(212,175,55,0.1)',  icon: '📚' },
  experience: { label: 'Experience', color: '#10B981', dim: 'rgba(16,185,129,0.1)',  icon: '💡' },
  founder:    { label: 'Founder',    color: '#F59E0B', dim: 'rgba(245,158,11,0.1)',  icon: '👑' },
}

const IMPORTANCE_COLOR = ['', '#6B7280', '#3B82F6', '#F59E0B', '#D4AF37', '#EF4444']

const card = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '16px',
}

const btn = (variant = 'default') => ({
  padding: '7px 14px',
  borderRadius: 'var(--radius-md)',
  border: variant === 'gold' ? '1px solid var(--border-gold)' : '1px solid var(--border)',
  background: variant === 'gold' ? 'var(--gold-dim)' : 'var(--bg-surface)',
  color: variant === 'gold' ? 'var(--gold)' : 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})

const btnDanger = {
  padding: '5px 10px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid rgba(239,68,68,0.3)',
  background: 'rgba(239,68,68,0.08)',
  color: '#EF4444',
  fontSize: '11px',
  cursor: 'pointer',
}

const inputStyle = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  padding: '8px 12px',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box',
}

const tag = (color = 'var(--text-muted)') => ({
  display: 'inline-block',
  padding: '2px 7px',
  borderRadius: '10px',
  background: `${color}15`,
  border: `1px solid ${color}30`,
  color,
  fontSize: '11px',
})

const TABS = [
  { key: 'dashboard',  label: 'Dashboard' },
  { key: 'collector',  label: 'Collector' },
  { key: 'long',       label: 'Long Memory' },
  { key: 'knowledge',  label: 'Knowledge' },
  { key: 'founder',    label: 'Founder' },
  { key: 'experience', label: 'Experience' },
  { key: 'search',     label: 'Search' },
  { key: 'timeline',   label: 'Timeline' },
]

// ── Main page ────────────────────────────────────────────────────────────────

export default function Memory() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
            Memory Core
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            Долгосрочная память AUREON AI Operating System
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Object.entries(TYPE_META).map(([t, m]) => (
            <span key={t} style={{ ...tag(m.color), fontSize: '10px' }}>{m.icon} {m.label}</span>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '9px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
              color: tab === t.key ? 'var(--gold)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              cursor: 'pointer',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'dashboard'  && <DashboardTab />}
      {tab === 'collector'  && <CollectorTab />}
      {tab === 'long'       && <LongMemoryTab />}
      {tab === 'knowledge'  && <KnowledgeTab />}
      {tab === 'founder'    && <FounderTab />}
      {tab === 'experience' && <ExperienceTab />}
      {tab === 'search'     && <SearchTab />}
      {tab === 'timeline'   && <TimelineTab />}
    </div>
  )
}

// ── Shared MemoryCard ─────────────────────────────────────────────────────────

function MemoryCard({ entry, onDeleted, onArchived, showContent = false }) {
  const [expanded, setExpanded] = useState(showContent)
  const meta = TYPE_META[entry.type] || TYPE_META.long

  async function handleDelete() {
    if (!confirm('Удалить запись?')) return
    try { await del(`/api/memory/${entry.id}`); onDeleted?.(entry.id) } catch (e) { alert(e.message) }
  }
  async function handleArchive() {
    try {
      await post(`/api/memory/${entry.id}/archive`)
      onArchived?.(entry.id)
    } catch (e) { alert(e.message) }
  }

  return (
    <div style={{
      ...card,
      borderLeft: `3px solid ${meta.color}`,
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Type + Category + Importance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ ...tag(meta.color), fontSize: '10px' }}>{meta.icon} {meta.label}</span>
            {entry.category && entry.category !== 'general' && (
              <span style={{ ...tag('var(--text-muted)'), fontSize: '10px' }}>{entry.category}</span>
            )}
            {entry.source && entry.source !== 'manual' && (
              <span style={{ ...tag('#6B7280'), fontSize: '10px' }}>⚙ {entry.source}</span>
            )}
            <ImportanceDots value={entry.importance} />
          </div>

          <div
            style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', marginBottom: 4 }}
            onClick={() => setExpanded(e => !e)}
          >
            {entry.title}
          </div>

          {entry.summary && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
              {entry.summary}
            </div>
          )}

          {expanded && entry.content && (
            <div style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: 8,
              padding: '10px 12px',
              background: 'var(--bg-base)',
              borderRadius: 6,
              whiteSpace: 'pre-wrap',
            }}>
              {entry.content}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {(entry.tags || []).map(t => (
              <span key={t} style={tag('var(--text-muted)')}>{t}</span>
            ))}
            {entry.content && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', padding: '2px 4px' }}
              >
                {expanded ? '▲ Свернуть' : '▼ Раскрыть'}
              </button>
            )}
          </div>

          {(entry.linked_objects || []).length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Связи:</span>
              {entry.linked_objects.map((obj, i) => (
                <span key={i} style={tag('#8B5CF6')}>{obj.type}: {obj.label || obj.id}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
            {entry.created_at ? new Date(entry.created_at).toLocaleDateString('ru-RU') : '—'}
          </div>
          <button style={btnDanger} onClick={handleArchive} title="Архивировать">⊙</button>
          <button style={btnDanger} onClick={handleDelete} title="Удалить">✕</button>
        </div>
      </div>
    </div>
  )
}

function ImportanceDots({ value = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i <= value ? IMPORTANCE_COLOR[value] : 'var(--border)',
        }} />
      ))}
    </div>
  )
}

// ── Add Entry Modal ───────────────────────────────────────────────────────────

function AddEntryModal({ defaultType = 'long', onCreated, onClose }) {
  const [form, setForm] = useState({
    type: defaultType,
    category: '',
    title: '',
    summary: '',
    content: '',
    tags: '',
    importance: 3,
    source: 'manual',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }
      const entry = await post('/api/memory', payload)
      onCreated?.(entry)
      onClose?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  }
  const modal = {
    ...card, width: '100%', maxWidth: 560, maxHeight: '90vh',
    overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12,
  }
  const label = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }
  const f = (k) => ({ ...inputStyle, value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <form style={modal} onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Новая запись</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={label}>Тип памяти</label>
            <select style={inputStyle} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {Object.entries(TYPE_META).map(([k, m]) => (
                <option key={k} value={k}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Категория</label>
            <input {...f('category')} style={inputStyle} placeholder="client, decision, brand…" />
          </div>
        </div>

        <div>
          <label style={label}>Заголовок *</label>
          <input {...f('title')} style={inputStyle} placeholder="Краткое название записи" required />
        </div>

        <div>
          <label style={label}>Краткое резюме</label>
          <input {...f('summary')} style={inputStyle} placeholder="1-2 предложения (если пусто — сгенерируется автоматически)" />
        </div>

        <div>
          <label style={label}>Полное содержание</label>
          <textarea
            style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
            value={form.content}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            placeholder="Детальное описание, контекст, выводы…"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={label}>Теги (через запятую)</label>
            <input {...f('tags')} style={inputStyle} placeholder="продажи, telegram, клиент" />
          </div>
          <div>
            <label style={label}>Важность (1-5)</label>
            <input
              type="number" min={1} max={5} style={inputStyle}
              value={form.importance}
              onChange={e => setForm(p => ({ ...p, importance: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" style={btn()} onClick={onClose}>Отмена</button>
          <button type="submit" style={btn('gold')} disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Tab: Dashboard ────────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setStats(await get('/api/memory/stats')) } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Загрузка…</div>
  if (!stats) return null

  const total = stats.total || 0
  const byType = stats.by_type || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <StatBlock label="Всего записей" value={total} color="var(--gold)" />
        {Object.entries(TYPE_META).map(([k, m]) => (
          <StatBlock key={k} label={m.label} value={byType[k] || 0} color={m.color} icon={m.icon} />
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Recent */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
            Последние записи
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(stats.recent || []).length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Нет записей</div>
            )}
            {(stats.recent || []).map(e => (
              <MiniCard key={e.id} entry={e} />
            ))}
          </div>
        </div>

        {/* Important */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
            Важные записи
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(stats.important || []).length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Нет записей</div>
            )}
            {(stats.important || []).map(e => (
              <MiniCard key={e.id} entry={e} />
            ))}
          </div>
        </div>
      </div>

      {/* Quick add */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Добавить запись</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Зафиксировать знание, решение или опыт</div>
        </div>
        <button style={btn('gold')} onClick={() => setShowAdd(true)}>+ Новая запись</button>
      </div>

      {showAdd && (
        <AddEntryModal
          defaultType="long"
          onCreated={() => { load(); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function StatBlock({ label, value, color, icon }) {
  return (
    <div style={{
      ...card,
      display: 'flex', flexDirection: 'column', gap: 4,
      borderTop: `2px solid ${color}`,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function MiniCard({ entry }) {
  const meta = TYPE_META[entry.type] || TYPE_META.long
  return (
    <div style={{
      background: 'var(--bg-base)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: 6,
      padding: '8px 10px',
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{entry.title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {meta.icon} {meta.label}
        {entry.created_at && (
          <span style={{ marginLeft: 8 }}>{new Date(entry.created_at).toLocaleDateString('ru-RU')}</span>
        )}
      </div>
    </div>
  )
}

// ── Tab: Collector (Telegram Memory Collector) ────────────────────────────────

const COLLECTOR_KINDS = [
  { key: '',       label: 'Все',            color: 'var(--gold)' },
  { key: 'idea',   label: '💡 Идеи',        color: '#D4AF37' },
  { key: 'task',   label: '✅ Задачи',      color: '#3B82F6' },
  { key: 'client', label: '🤝 Клиенты',     color: '#8B5CF6' },
  { key: 'note',   label: '📝 Заметки',     color: '#F59E0B' },
]

function CollectorTab() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState('')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setSearching(false)
    try {
      const params = new URLSearchParams({ limit: 100 })
      if (kind) params.set('type', kind)
      setEntries(await get(`/api/memory-collector/recent?${params}`))
    } catch { } finally { setLoading(false) }
  }, [kind])

  useEffect(() => { load() }, [load])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) { load(); return }
    setLoading(true)
    setSearching(true)
    try {
      const data = await get(`/api/memory-collector/search?q=${encodeURIComponent(query)}&limit=50`)
      setEntries(data.results || [])
    } catch { setEntries([]) } finally { setLoading(false) }
  }

  async function handleToTask(entry) {
    try {
      const res = await post(`/api/memory-collector/${entry.id}/to-task`)
      setEntries(p => p.map(x => x.id === entry.id ? res.entry : x))
      alert(`Задача #${res.task_id} создана`)
    } catch (e) { alert(e.message) }
  }

  async function handlePin(entry) {
    try {
      const res = await post(`/api/memory-collector/${entry.id}/pin`)
      setEntries(p => p.map(x => x.id === entry.id ? res.entry : x))
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div style={{
        ...card,
        background: 'rgba(59,130,246,0.05)',
        border: '1px solid rgba(59,130,246,0.2)',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#3B82F6', marginBottom: 4 }}>
          📥 Telegram Memory Collector
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Записи, сохранённые через Telegram-бота: /save, /idea, /task, /client — или любое сообщение с выбором типа.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {COLLECTOR_KINDS.map(k => (
          <button key={k.key} style={btn(kind === k.key && !searching ? 'gold' : 'default')}
            onClick={() => { setQuery(''); setKind(k.key) }}>{k.label}</button>
        ))}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <input
            style={{ ...inputStyle, width: 220 }}
            placeholder="Поиск по заметкам…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button type="submit" style={btn('gold')}>🔍</button>
        </form>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 16 }}>Загрузка…</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📥</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>
            {searching ? 'Ничего не найдено' : 'Пока нет сохранённых заметок'}
          </div>
          <div style={{ fontSize: 12 }}>Отправьте боту /save, /idea, /task или просто текст</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(e => {
            const hasTask = (e.linked_objects || []).some(o => o.type === 'task')
            return (
              <div key={e.id} style={{ position: 'relative' }}>
                <MemoryCard
                  entry={e}
                  onDeleted={id => setEntries(p => p.filter(x => x.id !== id))}
                  onArchived={id => setEntries(p => p.filter(x => x.id !== id))}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                  {!hasTask && (
                    <button style={btn()} onClick={() => handleToTask(e)}>📋 Convert to Task</button>
                  )}
                  {e.type !== 'founder' && (
                    <button style={btn('gold')} onClick={() => handlePin(e)}>📌 Pin to Founder</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tab: Long Memory ──────────────────────────────────────────────────────────

function LongMemoryTab() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [catFilter, setCatFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: 'long', limit: 100 })
      if (catFilter) params.set('category', catFilter)
      setEntries(await get(`/api/memory?${params}`))
    } catch { } finally { setLoading(false) }
  }, [catFilter])

  useEffect(() => { load() }, [load])

  const categories = [...new Set(entries.map(e => e.category).filter(Boolean))]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Категории:</div>
        <button style={btn(catFilter === '' ? 'gold' : 'default')} onClick={() => setCatFilter('')}>Все</button>
        {categories.map(c => (
          <button key={c} style={btn(catFilter === c ? 'gold' : 'default')} onClick={() => setCatFilter(c)}>{c}</button>
        ))}
        <button style={{ ...btn('gold'), marginLeft: 'auto' }} onClick={() => setShowAdd(true)}>+ Добавить</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 16 }}>Загрузка…</div>
      ) : entries.length === 0 ? (
        <EmptyState type="long" onAdd={() => setShowAdd(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(e => (
            <MemoryCard
              key={e.id} entry={e}
              onDeleted={id => setEntries(p => p.filter(x => x.id !== id))}
              onArchived={id => setEntries(p => p.filter(x => x.id !== id))}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddEntryModal
          defaultType="long"
          onCreated={entry => { setEntries(p => [entry, ...p]); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

// ── Tab: Knowledge ────────────────────────────────────────────────────────────

function KnowledgeTab() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setEntries(await get('/api/memory/knowledge?limit=100')) } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const grouped = entries.reduce((acc, e) => {
    const cat = e.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(e)
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={btn('gold')} onClick={() => setShowAdd(true)}>+ Добавить знание</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 16 }}>Загрузка…</div>
      ) : entries.length === 0 ? (
        <EmptyState type="knowledge" onAdd={() => setShowAdd(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--gold)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ flex: 1 }}>{cat}</span>
                <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                {items.map(e => (
                  <MemoryCard
                    key={e.id} entry={e}
                    onDeleted={id => setEntries(p => p.filter(x => x.id !== id))}
                    onArchived={id => setEntries(p => p.filter(x => x.id !== id))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddEntryModal
          defaultType="knowledge"
          onCreated={entry => { setEntries(p => [entry, ...p]); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

// ── Tab: Founder ──────────────────────────────────────────────────────────────

function FounderTab() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setEntries(await get('/api/memory/founder?limit=100')) } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{
        ...card,
        background: 'rgba(212,175,55,0.05)',
        border: '1px solid rgba(212,175,55,0.2)',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 4 }}>
          👑 Память основателя
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Архитектурные решения, причины, планы, философия проекта. Через год агент будет понимать,
          почему AUREON устроен именно так.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={btn('gold')} onClick={() => setShowAdd(true)}>+ Добавить запись</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 16 }}>Загрузка…</div>
      ) : entries.length === 0 ? (
        <EmptyState type="founder" onAdd={() => setShowAdd(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(e => (
            <MemoryCard
              key={e.id} entry={e} showContent={false}
              onDeleted={id => setEntries(p => p.filter(x => x.id !== id))}
              onArchived={id => setEntries(p => p.filter(x => x.id !== id))}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddEntryModal
          defaultType="founder"
          onCreated={entry => { setEntries(p => [entry, ...p]); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

// ── Tab: Experience ───────────────────────────────────────────────────────────

function ExperienceTab() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setEntries(await get('/api/memory/experience?limit=100')) } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            💡 Что сработало и что нет. Агент использует эти данные для принятия решений.
          </div>
        </div>
        <button style={btn('gold')} onClick={() => setShowAdd(true)}>+ Добавить опыт</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 16 }}>Загрузка…</div>
      ) : entries.length === 0 ? (
        <EmptyState type="experience" onAdd={() => setShowAdd(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(e => (
            <ExperienceCard
              key={e.id} entry={e}
              onDeleted={id => setEntries(p => p.filter(x => x.id !== id))}
              onArchived={id => setEntries(p => p.filter(x => x.id !== id))}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddEntryModal
          defaultType="experience"
          onCreated={entry => { setEntries(p => [entry, ...p]); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function ExperienceCard({ entry, onDeleted, onArchived }) {
  const [expanded, setExpanded] = useState(false)
  const imp = entry.importance || 3
  const impColor = IMPORTANCE_COLOR[Math.min(imp, 5)]

  async function handleDelete() {
    if (!confirm('Удалить?')) return
    try { await del(`/api/memory/${entry.id}`); onDeleted?.(entry.id) } catch (e) { alert(e.message) }
  }

  return (
    <div style={{
      ...card,
      borderLeft: `3px solid ${impColor}`,
    }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: `${impColor}20`,
          border: `1px solid ${impColor}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          💡
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', flex: 1 }}
              onClick={() => setExpanded(e => !e)}
            >
              {entry.title}
            </div>
            <ImportanceDots value={imp} />
            <button style={btnDanger} onClick={handleDelete}>✕</button>
          </div>

          {entry.summary && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
              {entry.summary}
            </div>
          )}

          {expanded && entry.content && (
            <div style={{
              fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
              padding: '10px 12px', background: 'var(--bg-base)', borderRadius: 6,
              whiteSpace: 'pre-wrap', marginBottom: 8,
            }}>
              {entry.content}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {(entry.tags || []).map(t => <span key={t} style={tag('#10B981')}>{t}</span>)}
            {entry.content && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}
              >
                {expanded ? '▲ Свернуть' : '▼ Подробнее'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Search ───────────────────────────────────────────────────────────────

function SearchTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const data = await get(`/api/memory/search?q=${encodeURIComponent(query)}`)
      setResults(data.results || [])
    } catch { setResults([]) } finally { setLoading(false) }
  }

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Поиск по памяти: клиент, решение, технология, опыт…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit" style={btn('gold')} disabled={loading}>
          {loading ? '⏳' : '🔍 Найти'}
        </button>
      </form>

      {loading && <div style={{ color: 'var(--text-muted)', padding: 16 }}>Поиск…</div>}

      {!loading && searched && results.length === 0 && (
        <div style={{ color: 'var(--text-muted)', padding: 16, textAlign: 'center' }}>
          Ничего не найдено по запросу «{query}»
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Найдено: {results.length} записей
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map(e => (
              <MemoryCard key={e.id} entry={e} onDeleted={id => setResults(p => p.filter(x => x.id !== id))} />
            ))}
          </div>
        </div>
      )}

      {!searched && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
          Введите запрос для поиска по всем типам памяти
        </div>
      )}
    </div>
  )
}

// ── Tab: Timeline ─────────────────────────────────────────────────────────────

function TimelineTab() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setGroups(await get('/api/memory/timeline')) } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Загрузка…</div>
  if (!groups.length) return (
    <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
      Timeline пуст. Добавляйте записи — они появятся здесь.
    </div>
  )

  return (
    <div style={{ paddingLeft: 20 }}>
      {groups.map((group, gi) => (
        <div key={gi} style={{ position: 'relative', paddingLeft: 28, marginBottom: 28 }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', left: 8, top: 24, bottom: -8,
            width: 1, background: 'var(--border)',
          }} />
          {/* Month dot */}
          <div style={{
            position: 'absolute', left: 0, top: 4,
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--gold-dim)',
            border: '2px solid var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} />

          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 12, fontFamily: 'Space Grotesk' }}>
            {group.month}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(group.events || []).map(e => {
              const meta = TYPE_META[e.type] || TYPE_META.long
              return (
                <div key={e.id} style={{
                  ...card,
                  borderLeft: `3px solid ${meta.color}`,
                  padding: '10px 14px',
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14 }}>{meta.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{e.title}</div>
                      {e.summary && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{e.summary}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {e.created_at ? new Date(e.created_at).toLocaleDateString('ru-RU') : '—'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ type, onAdd }) {
  const meta = TYPE_META[type] || TYPE_META.long
  return (
    <div style={{
      textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)',
    }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{meta.icon}</div>
      <div style={{ fontSize: 14, marginBottom: 4 }}>Нет записей в {meta.label}</div>
      <div style={{ fontSize: 12, marginBottom: 16 }}>Добавьте первую запись</div>
      <button style={btn('gold')} onClick={onAdd}>+ Добавить</button>
    </div>
  )
}
