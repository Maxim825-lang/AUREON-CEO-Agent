import React, { useEffect, useState, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || ''

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const r = await fetch(`${API}${path}`, opts)
  if (!r.ok) {
    const data = await r.json().catch(() => null)
    const msg = (typeof data?.detail === 'string' ? data.detail : null)
      || data?.reason
      || `HTTP ${r.status}`
    const err = new Error(msg)
    err.data = data
    throw err
  }
  return r.json()
}

const get = (path) => api('GET', path)
const post = (path, body) => api('POST', path, body)
const put = (path, body) => api('PUT', path, body)

// ── Styles ────────────────────────────────────────────────────────────────────

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

const tag = (color = 'var(--text-muted)') => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${color}30`,
  color,
  fontSize: '11px',
})

const input = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  padding: '8px 12px',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box',
}

const toggle = (on) => ({
  display: 'inline-flex',
  alignItems: 'center',
  width: 36,
  height: 20,
  borderRadius: 10,
  background: on ? 'var(--gold)' : 'var(--border)',
  cursor: 'pointer',
  transition: 'background 0.2s',
  position: 'relative',
  flexShrink: 0,
})

const toggleDot = (on) => ({
  position: 'absolute',
  left: on ? 18 : 2,
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: on ? '#0A0A0B' : 'var(--text-muted)',
  transition: 'left 0.2s',
})

function Toggle({ value, onChange }) {
  return (
    <div style={toggle(value)} onClick={() => onChange(!value)}>
      <div style={toggleDot(value)} />
    </div>
  )
}

const PIPELINE_STATUSES = [
  { key: 'found', label: 'Found', color: 'var(--text-muted)' },
  { key: 'outreach_ready', label: 'Ready', color: 'var(--blue)' },
  { key: 'contacted', label: 'Contacted', color: 'var(--gold)' },
  { key: 'replied', label: 'Replied', color: '#a78bfa' },
  { key: 'qualified', label: 'Qualified', color: '#f59e0b' },
  { key: 'proposal_sent', label: 'Proposal', color: '#06b6d4' },
  { key: 'meeting_scheduled', label: 'Meeting', color: '#8b5cf6' },
  { key: 'won', label: 'Won', color: 'var(--green)' },
  { key: 'lost', label: 'Lost', color: 'var(--red)' },
]

function fmt(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) }
  catch { return iso }
}

// ── TABS ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'queue', label: 'Outreach Queue' },
  { key: 'import', label: 'Import' },
  { key: 'forecast', label: 'Revenue' },
  { key: 'settings', label: 'Settings' },
]

// ── Pipeline Tab ──────────────────────────────────────────────────────────────

function PipelineTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [generating, setGenerating] = useState({})

  const load = useCallback(async () => {
    try {
      const d = await get('/api/sales/pipeline')
      setData(d)
      setErr(null)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleGenerate = async (leadId) => {
    setGenerating(g => ({ ...g, [leadId]: true }))
    try {
      await post(`/api/sales/generate-outreach/${leadId}`)
      await load()
    } catch (e) {
      alert(e.message)
    }
    setGenerating(g => ({ ...g, [leadId]: false }))
  }

  const handleSend = async (leadId) => {
    try {
      const r = await post(`/api/sales/send-outreach/${leadId}`)
      alert(r.delivery || 'Отправлено')
      await load()
    } catch (e) {
      const d = e.data
      if (d?.reason) {
        const parts = [`Причина: ${d.reason}`]
        if (d.username) parts.push(`Username: ${d.username}`)
        parts.push(`chat_id: ${d.telegram_chat_id || 'нет'}`)
        if (d.telegram_error) parts.push(`Telegram: ${d.telegram_error}`)
        alert(parts.join('\n'))
      } else {
        alert(e.message)
      }
    }
  }

  const handleReset = async (leadId) => {
    try {
      await post(`/api/sales/reset-lead/${leadId}`)
      await load()
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Загрузка...</div>
  if (err) return <div style={{ color: 'var(--red)', padding: 24 }}>{err}</div>

  const columns = data?.columns || {}
  const stats = data?.stats || {}

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Всего лидов', value: stats.total_leads },
          { label: 'Активных', value: stats.active },
          { label: 'Won', value: stats.won },
          { label: 'Won Revenue', value: `$${(stats.won_revenue || 0).toLocaleString()}` },
          { label: 'Forecast (взвеш.)', value: `$${(stats.weighted_forecast || 0).toLocaleString()}` },
        ].map(s => (
          <div key={s.label} style={{ ...card, flex: '1 1 140px', minWidth: 120 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gold)' }}>{s.value ?? '—'}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {PIPELINE_STATUSES.map(({ key, label, color }) => {
          const leads = columns[key] || []
          return (
            <div key={key} style={{ minWidth: 200, maxWidth: 240, flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                marginBottom: 10, padding: '6px 10px',
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                border: `1px solid ${color}40`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color }}>{label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>{leads.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leads.length === 0 && (
                  <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                    пусто
                  </div>
                )}
                {leads.map(lead => (
                  <div key={lead.id} style={{
                    ...card, padding: '12px',
                    borderLeft: `3px solid ${color}60`,
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{lead.name}</div>
                    {lead.company && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 4 }}>{lead.company}</div>}
                    {lead.niche && <span style={tag(color)}>{lead.niche}</span>}
                    {lead.estimated_price > 0 && (
                      <div style={{ marginTop: 6, fontSize: '12px', color: 'var(--green)' }}>${lead.estimated_price.toLocaleString()}</div>
                    )}
                    {lead.telegram && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>{lead.telegram}</div>
                    )}
                    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                      {(key === 'found' || key === 'outreach_ready') && (
                        <button style={btn('default')} onClick={() => handleGenerate(lead.id)} disabled={generating[lead.id]}>
                          {generating[lead.id] ? '...' : 'Generate'}
                        </button>
                      )}
                      {key === 'outreach_ready' && (
                        <button style={btn('gold')} onClick={() => handleSend(lead.id)}>Send</button>
                      )}
                      {key !== 'found' && (
                        <button
                          style={{ ...btn('default'), color: 'var(--text-muted)', fontSize: '11px' }}
                          onClick={() => handleReset(lead.id)}
                          title="Сбросить статус → found (для повторного теста)"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Inbox Tab ─────────────────────────────────────────────────────────────────

function InboxTab() {
  const [convs, setConvs] = useState([])
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [sending, setSending] = useState(false)
  const [inboundText, setInboundText] = useState('')
  const [addingInbound, setAddingInbound] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await get('/api/sales/inbox')
      setConvs(d)
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const handleSuggest = async () => {
    if (!selected) return
    setSuggesting(true)
    try {
      const r = await post(`/api/sales/generate-reply/${selected.conversation_id}`)
      setReply(r.suggested_reply || '')
    } catch (e) {
      alert(e.message)
    }
    setSuggesting(false)
  }

  const handleSend = async () => {
    if (!selected || !reply.trim()) return
    setSending(true)
    try {
      const r = await post(`/api/sales/send-reply/${selected.conversation_id}?content=${encodeURIComponent(reply)}`)
      alert(r.sent_via_telegram ? 'Отправлено в Telegram' : 'Сохранено (ручная отправка)')
      setReply('')
      await load()
      const updated = convs.find(c => c.conversation_id === selected.conversation_id)
      setSelected(updated || null)
    } catch (e) {
      alert(e.message)
    }
    setSending(false)
  }

  const handleAddInbound = async () => {
    if (!selected || !inboundText.trim()) return
    setAddingInbound(true)
    try {
      await post(`/api/sales/conversations/${selected.lead_id}/add-inbound`, { content: inboundText })
      setInboundText('')
      await load()
    } catch (e) {
      alert(e.message)
    }
    setAddingInbound(false)
  }

  const selConv = selected ? convs.find(c => c.conversation_id === selected.conversation_id) || selected : null

  return (
    <div style={{ display: 'flex', gap: 16, height: '600px' }}>
      {/* Left: conversation list */}
      <div style={{ width: 280, flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 4 }}>
          {convs.length} диалогов
        </div>
        {convs.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: 16 }}>
            Нет диалогов. Отправьте outreach чтобы создать первый.
          </div>
        )}
        {convs.map(conv => (
          <div
            key={conv.conversation_id}
            onClick={() => setSelected(conv)}
            style={{
              ...card,
              cursor: 'pointer',
              borderColor: selConv?.conversation_id === conv.conversation_id ? 'var(--border-gold)' : 'var(--border)',
              background: selConv?.conversation_id === conv.conversation_id ? 'var(--gold-dim)' : 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{conv.lead_name}</div>
              {conv.unread_inbound > 0 && (
                <span style={{ ...tag('var(--gold)'), background: 'var(--gold-dim)' }}>{conv.unread_inbound} new</span>
              )}
            </div>
            {conv.lead_telegram && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{conv.lead_telegram}</div>}
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 6, overflow: 'hidden', maxHeight: 36 }}>
              {conv.last_message_direction === 'inbound' && <span style={{ color: 'var(--gold)' }}>[ответил] </span>}
              {conv.last_message?.slice(0, 60)}...
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4 }}>{fmt(conv.last_message_at)}</div>
          </div>
        ))}
      </div>

      {/* Right: thread + reply */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!selConv ? (
          <div style={{ ...card, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Выберите диалог слева
          </div>
        ) : (
          <>
            {/* Thread */}
            <div style={{ ...card, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 8 }}>
                {selConv.lead_name} · {selConv.lead_telegram}
              </div>
              {(selConv.messages || []).map(msg => (
                <div key={msg.id} style={{
                  alignSelf: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }}>
                  <div style={{
                    background: msg.direction === 'outbound' ? 'var(--gold-dim)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${msg.direction === 'outbound' ? 'var(--border-gold)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2, textAlign: msg.direction === 'outbound' ? 'right' : 'left' }}>
                    {msg.direction === 'outbound' ? 'AUREON AI' : selConv.lead_name} · {fmt(msg.created_at)}
                  </div>
                </div>
              ))}
            </div>

            {/* Add inbound (simulate reply) */}
            <div style={{ ...card }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 6 }}>Добавить входящий ответ вручную (симуляция)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...input, flex: 1 }}
                  placeholder="Текст ответа от лида..."
                  value={inboundText}
                  onChange={e => setInboundText(e.target.value)}
                />
                <button style={btn('default')} onClick={handleAddInbound} disabled={addingInbound}>
                  {addingInbound ? '...' : 'Добавить'}
                </button>
              </div>
            </div>

            {/* Reply area */}
            <div style={{ ...card }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>Ответ</div>
                <button style={btn('gold')} onClick={handleSuggest} disabled={suggesting}>
                  {suggesting ? '...' : 'AI Suggest'}
                </button>
              </div>
              <textarea
                style={{ ...input, height: 80, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Напишите ответ или нажмите AI Suggest..."
                value={reply}
                onChange={e => setReply(e.target.value)}
              />
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  style={{ ...btn('gold'), opacity: !reply.trim() ? 0.5 : 1 }}
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                >
                  {sending ? '...' : 'Send Reply'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Outreach Queue Tab ────────────────────────────────────────────────────────

function QueueTab() {
  const [leads, setLeads] = useState([])
  const [msgs, setMsgs] = useState({})
  const [generating, setGenerating] = useState({})
  const [sending, setSending] = useState({})

  const load = useCallback(async () => {
    try {
      const r = await get('/api/sales/pipeline')
      const found = r.columns?.found || []
      const ready = r.columns?.outreach_ready || []
      setLeads([...found, ...ready])
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const handleGenerate = async (lead) => {
    setGenerating(g => ({ ...g, [lead.id]: true }))
    try {
      const r = await post(`/api/sales/generate-outreach/${lead.id}`)
      setMsgs(m => ({ ...m, [lead.id]: r.message }))
      await load()
    } catch (e) {
      alert(e.message)
    }
    setGenerating(g => ({ ...g, [lead.id]: false }))
  }

  const handleSend = async (lead) => {
    setSending(s => ({ ...s, [lead.id]: true }))
    try {
      const r = await post(`/api/sales/send-outreach/${lead.id}`)
      alert(r.delivery || 'OK')
      await load()
    } catch (e) {
      const d = e.data
      if (d?.reason) {
        const parts = [`Причина: ${d.reason}`]
        if (d.username) parts.push(`Username: ${d.username}`)
        parts.push(`chat_id: ${d.telegram_chat_id || 'нет'}`)
        if (d.telegram_error) parts.push(`Telegram: ${d.telegram_error}`)
        alert(parts.join('\n'))
      } else {
        alert(e.message)
      }
    }
    setSending(s => ({ ...s, [lead.id]: false }))
  }

  const handleReset = async (lead) => {
    try {
      await post(`/api/sales/reset-lead/${lead.id}`)
      await load()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {leads.length} лидов готовы к outreach
        </div>
        <button style={btn('gold')} onClick={load}>Обновить</button>
      </div>
      {leads.length === 0 && (
        <div style={{ ...card, color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
          Нет лидов в очереди. Импортируйте лидов через вкладку Import.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {leads.map(lead => (
          <div key={lead.id} style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {lead.name}
                  {lead.company && <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 8 }}>{lead.company}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {lead.niche && <span style={tag('var(--gold)')}>{lead.niche}</span>}
                  {lead.telegram && <span style={tag('var(--text-muted)')}>{lead.telegram}</span>}
                  {lead.estimated_price > 0 && <span style={tag('var(--green)')}>от ${lead.estimated_price}</span>}
                </div>
                {(msgs[lead.id] || lead.last_message) && (
                  <div style={{
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    marginTop: 8,
                    maxHeight: 140,
                    overflowY: 'auto',
                  }}>
                    {msgs[lead.id] || lead.last_message}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button style={btn('default')} onClick={() => handleGenerate(lead)} disabled={generating[lead.id]}>
                  {generating[lead.id] ? '...' : 'Generate'}
                </button>
                {(msgs[lead.id] || lead.status === 'outreach_ready') && (
                  <button style={btn('gold')} onClick={() => handleSend(lead)} disabled={sending[lead.id]}>
                    {sending[lead.id] ? '...' : 'Send'}
                  </button>
                )}
                <button
                  style={{ ...btn('default'), color: 'var(--text-muted)', fontSize: '11px' }}
                  onClick={() => handleReset(lead)}
                  title="Сбросить в found для повторного теста"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Import Tab ────────────────────────────────────────────────────────────────

function ImportTab() {
  const [tab, setTab] = useState('manual')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Manual form
  const [form, setForm] = useState({ name: '', telegram: '', niche: '', company: '', problem: '', estimated_price: '' })

  const handleManual = async (e) => {
    e.preventDefault()
    if (!form.name && !form.telegram) return alert('Укажите имя или telegram')
    setLoading(true)
    try {
      const r = await post('/api/sales/import-leads', {
        leads: [{ ...form, estimated_price: parseFloat(form.estimated_price) || 0 }],
      })
      setResult(`Добавлено: ${r.imported}, пропущено: ${r.skipped}`)
      setForm({ name: '', telegram: '', niche: '', company: '', problem: '', estimated_price: '' })
    } catch (e) {
      setResult(`Ошибка: ${e.message}`)
    }
    setLoading(false)
  }

  // Bulk usernames
  const [usernames, setUsernames] = useState('')
  const [uniche, setUniche] = useState('')

  const handleUsernames = async () => {
    if (!usernames.trim()) return
    setLoading(true)
    try {
      const r = await post('/api/sales/import-usernames', { usernames, niche: uniche || 'general' })
      setResult(`Добавлено: ${r.imported}, пропущено: ${r.skipped}`)
      setUsernames('')
    } catch (e) {
      setResult(`Ошибка: ${e.message}`)
    }
    setLoading(false)
  }

  // CSV upload
  const fileRef = useRef(null)
  const handleCsv = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return alert('Выберите CSV файл')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`${API}/api/sales/import-csv`, { method: 'POST', body: fd })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || `HTTP ${r.status}`)
      setResult(`Добавлено: ${data.imported}, пропущено: ${data.skipped}`)
    } catch (e) {
      setResult(`Ошибка: ${e.message}`)
    }
    setLoading(false)
  }

  const ITABS = ['manual', 'usernames', 'csv']
  const ILABELS = { manual: 'Вручную', usernames: 'Usernames', csv: 'CSV файл' }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {ITABS.map(t => (
          <button key={t} style={{ ...btn(tab === t ? 'gold' : 'default') }} onClick={() => setTab(t)}>
            {ILABELS[t]}
          </button>
        ))}
      </div>

      {result && (
        <div style={{
          ...card, marginBottom: 16,
          borderColor: result.startsWith('Ошибка') ? 'var(--red)' : 'var(--green)',
          color: result.startsWith('Ошибка') ? 'var(--red)' : 'var(--green)',
          fontSize: '13px',
        }}>
          {result}
        </div>
      )}

      {tab === 'manual' && (
        <form onSubmit={handleManual} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'name', label: 'Имя / Название', placeholder: 'John Doe / @channel' },
              { key: 'telegram', label: 'Telegram', placeholder: '@username или chat_id' },
              { key: 'company', label: 'Компания', placeholder: 'Acme Corp' },
              { key: 'niche', label: 'Ниша', placeholder: 'education, telegram, services...' },
              { key: 'estimated_price', label: 'Бюджет ($)', placeholder: '500' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input
                  style={input}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Проблема / контекст</label>
            <textarea
              style={{ ...input, height: 80, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Чем занимаются, какая проблема..."
              value={form.problem}
              onChange={e => setForm(fm => ({ ...fm, problem: e.target.value }))}
            />
          </div>
          <button type="submit" style={{ ...btn('gold'), alignSelf: 'flex-start', padding: '9px 20px' }} disabled={loading}>
            {loading ? '...' : 'Добавить лида'}
          </button>
        </form>
      )}

      {tab === 'usernames' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Вставьте usernames — по одному в строке. Формат: @username или username
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ниша (для всех)</label>
            <input style={input} placeholder="telegram, education, services..." value={uniche} onChange={e => setUniche(e.target.value)} />
          </div>
          <textarea
            style={{ ...input, height: 200, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
            placeholder={'@username1\n@username2\n@username3'}
            value={usernames}
            onChange={e => setUsernames(e.target.value)}
          />
          <button style={{ ...btn('gold'), alignSelf: 'flex-start', padding: '9px 20px' }} onClick={handleUsernames} disabled={loading}>
            {loading ? '...' : 'Импортировать'}
          </button>
        </div>
      )}

      {tab === 'csv' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...card, background: 'var(--bg-base)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: 8 }}>Формат CSV файла</div>
            <pre style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
{`name,telegram,niche,company,problem,estimated_price,source_url
Иван Иванов,@ivanov,education,School X,нет автозаписи,600,https://t.me/ivanov
Jane Doe,@jane,services,Salon Y,,400,`}
            </pre>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>CSV файл</label>
            <input ref={fileRef} type="file" accept=".csv" style={{ color: 'var(--text-primary)', fontSize: '13px' }} />
          </div>
          <button style={{ ...btn('gold'), alignSelf: 'flex-start', padding: '9px 20px' }} onClick={handleCsv} disabled={loading}>
            {loading ? '...' : 'Загрузить CSV'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Revenue Forecast Tab ──────────────────────────────────────────────────────

const PROB = { found: 5, outreach_ready: 8, contacted: 12, replied: 20, qualified: 35, proposal_sent: 50, meeting_scheduled: 70, won: 100, lost: 0 }

function ForecastTab() {
  const [data, setData] = useState(null)

  useEffect(() => {
    get('/api/sales/pipeline').then(setData).catch(() => {})
  }, [])

  if (!data) return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Загрузка...</div>

  const columns = data.columns || {}
  const rows = PIPELINE_STATUSES.map(({ key, label, color }) => {
    const leads = columns[key] || []
    const total = leads.reduce((s, l) => s + (l.estimated_price || 0), 0)
    const prob = PROB[key] || 0
    return { key, label, color, count: leads.length, total, prob, weighted: Math.round(total * prob / 100) }
  })

  const totalWeighted = rows.reduce((s, r) => s + r.weighted, 0)
  const wonRevenue = rows.find(r => r.key === 'won')?.total || 0
  const pipeline = rows.filter(r => !['won', 'lost'].includes(r.key)).reduce((s, r) => s + r.total, 0)

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Закрыто (Won)', value: `$${wonRevenue.toLocaleString()}`, color: 'var(--green)' },
          { label: 'В воронке', value: `$${pipeline.toLocaleString()}`, color: 'var(--gold)' },
          { label: 'Weighted Forecast', value: `$${totalWeighted.toLocaleString()}`, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={{ ...card, flex: '1 1 160px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card }}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: 12 }}>Воронка по этапам</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Этап', 'Лидов', 'Сумма', 'Вероятность', 'Взвешенно'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} style={{ borderBottom: '1px solid var(--border)20' }}>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.color }} />
                    <span style={{ color: r.color }}>{r.label}</span>
                  </span>
                </td>
                <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{r.count}</td>
                <td style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>{r.total > 0 ? `$${r.total.toLocaleString()}` : '—'}</td>
                <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{r.prob}%</td>
                <td style={{ padding: '8px 10px', color: r.weighted > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                  {r.weighted > 0 ? `$${r.weighted.toLocaleString()}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [s, setS] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [autoRunning, setAutoRunning] = useState(false)
  const [autoResult, setAutoResult] = useState(null)

  const load = useCallback(async () => {
    try { const d = await get('/api/sales/settings'); setS(d) } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      const d = await put('/api/sales/settings', s)
      setS(d)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert(e.message)
    }
    setSaving(false)
  }

  const handleAutoRun = async () => {
    setAutoRunning(true)
    setAutoResult(null)
    try {
      const r = await post('/api/sales/auto-run')
      setAutoResult(r)
    } catch (e) {
      setAutoResult({ ok: false, message: e.message })
    }
    setAutoRunning(false)
  }

  if (!s) return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Загрузка...</div>

  const toggleField = (field) => setS(prev => ({ ...prev, [field]: !prev[field] }))
  const setField = (field, val) => setS(prev => ({ ...prev, [field]: val }))

  return (
    <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Mode switches */}
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 14 }}>Режимы автономии</div>
        {[
          { field: 'real_sales_mode', label: 'Real Sales Mode', desc: 'Включает систему продаж. Без этого отправка заблокирована.' },
          { field: 'auto_send_first', label: 'Auto Send First Message', desc: 'Автоматически отправляет первое сообщение лидам из очереди.' },
          { field: 'auto_reply', label: 'Auto Reply', desc: 'AI автоматически отвечает на входящие (когда включено).' },
        ].map(({ field, label, desc }) => (
          <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
            </div>
            <Toggle value={!!s[field]} onChange={() => toggleField(field)} />
          </div>
        ))}
      </div>

      {/* Limits */}
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 14 }}>Лимиты</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { field: 'daily_limit', label: 'Лимит outreach в день', type: 'number', min: 1, max: 50 },
            { field: 'min_price', label: 'Минимальная цена ($)', type: 'number', min: 0 },
            { field: 'max_discount', label: 'Макс. скидка (%)', type: 'number', min: 0, max: 100 },
          ].map(f => (
            <div key={f.field}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
              <input
                style={input}
                type={f.type}
                min={f.min}
                max={f.max}
                value={s[f.field] ?? ''}
                onChange={e => setField(f.field, parseFloat(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Safety */}
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 14 }}>Безопасность</div>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Запрещённые слова (через запятую)
          </label>
          <input
            style={input}
            placeholder="spam, купи сейчас, срочно..."
            value={(s.forbidden_words || []).join(', ')}
            onChange={e => setField('forbidden_words', e.target.value.split(',').map(w => w.trim()).filter(Boolean))}
          />
        </div>
        <div style={{ marginTop: 10, fontSize: '11px', color: 'var(--text-muted)' }}>
          Сообщения с запрещёнными словами не отправляются автоматически.
        </div>
      </div>

      {/* Telegram */}
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 14 }}>Telegram Bot API</div>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Bot Token (для DM-рассылки)
          </label>
          <input
            style={input}
            type="password"
            placeholder="1234567890:AAF..."
            value={s.telegram_bot_token || ''}
            onChange={e => setField('telegram_bot_token', e.target.value)}
          />
        </div>
        <div style={{ marginTop: 10, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          ⚠️ Бот может отправить DM только пользователям, которые первыми написали боту (Telegram API ограничение).
          Для остальных лидов — сообщение сохраняется для ручной отправки.
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button style={{ ...btn('gold'), padding: '9px 24px' }} onClick={save} disabled={saving}>
          {saving ? '...' : 'Сохранить настройки'}
        </button>
        {saved && <span style={{ fontSize: '12px', color: 'var(--green)' }}>Сохранено</span>}
      </div>

      {/* Auto run */}
      <div style={{ ...card, borderColor: s.real_sales_mode && s.auto_send_first ? 'var(--border-gold)' : 'var(--border)' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 8 }}>Auto-Run Outreach</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12 }}>
          Запускает цикл: берёт лидов из очереди (found/outreach_ready), генерирует и отправляет сообщения до дневного лимита.
          Работает только если включён Real Sales Mode и Auto Send.
        </div>
        <button style={{ ...btn(s.real_sales_mode && s.auto_send_first ? 'gold' : 'default'), padding: '9px 20px' }} onClick={handleAutoRun} disabled={autoRunning}>
          {autoRunning ? 'Запускаю...' : 'Run Now'}
        </button>
        {autoResult && (
          <div style={{ marginTop: 10, fontSize: '12px', color: autoResult.ok ? 'var(--green)' : 'var(--text-muted)' }}>
            {autoResult.ok
              ? `Сгенерировано: ${autoResult.generated_count}, отправлено: ${autoResult.sent_count}, ручная отправка: ${autoResult.manual_required_count}, пропущено: ${autoResult.skipped_count}. Сегодня: ${autoResult.sent_today_total}/${autoResult.daily_limit}`
              : autoResult.message}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Sales Page ───────────────────────────────────────────────────────────

export default function Sales() {
  const [tab, setTab] = useState('pipeline')
  const [autoRunning, setAutoRunning] = useState(false)
  const [autoResult, setAutoResult] = useState(null)

  const handleAutoRun = async () => {
    setAutoRunning(true)
    setAutoResult(null)
    try {
      const r = await post('/api/sales/auto-run')
      setAutoResult(r)
    } catch (e) {
      setAutoResult({ ok: false, message: e.message })
    }
    setAutoRunning(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Sales Agent
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
            Реальный outreach · AI-представитель AUREON · Disclosure всегда включён
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            style={{
              ...btn('gold'),
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              opacity: autoRunning ? 0.7 : 1,
            }}
            onClick={handleAutoRun}
            disabled={autoRunning}
          >
            {autoRunning ? '⟳ Запускаю...' : '⚡ Run Auto Sales'}
          </button>
          <div style={{
            padding: '6px 14px',
            background: 'var(--gold-dim)',
            border: '1px solid var(--border-gold)',
            borderRadius: '20px',
            fontSize: '11px',
            color: 'var(--gold)',
            fontWeight: 600,
          }}>
            AI SALES AGENT
          </div>
        </div>
      </div>

      {/* Auto-run result banner */}
      {autoResult && (
        <div style={{
          background: autoResult.ok ? 'var(--green-dim)' : 'rgba(239,68,68,0.06)',
          border: `1px solid ${autoResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
          animation: 'fadeIn 0.2s ease',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: autoResult.ok ? 'var(--green)' : 'var(--red)' }}>
            {autoResult.ok ? '✓ Auto Sales Loop завершён' : `✗ ${autoResult.message}`}
          </span>
          {autoResult.ok && (
            <>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Сгенерировано: <b style={{ color: 'var(--gold)' }}>{autoResult.generated_count}</b>
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Отправлено: <b style={{ color: 'var(--green)' }}>{autoResult.sent_count}</b>
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Ручная отправка: <b style={{ color: 'var(--gold)' }}>{autoResult.manual_required_count}</b>
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Пропущено: <b style={{ color: 'var(--text-muted)' }}>{autoResult.skipped_count}</b>
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Сегодня: {autoResult.sent_today_total}/{autoResult.daily_limit}
              </span>
            </>
          )}
          <button
            style={{ marginLeft: 'auto', ...btn('default'), padding: '3px 10px', fontSize: '11px' }}
            onClick={() => setAutoResult(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
              background: 'transparent',
              color: tab === t.key ? 'var(--gold)' : 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: tab === t.key ? 600 : 400,
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'pipeline' && <PipelineTab />}
        {tab === 'inbox' && <InboxTab />}
        {tab === 'queue' && <QueueTab />}
        {tab === 'import' && <ImportTab />}
        {tab === 'forecast' && <ForecastTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
