import React, { useEffect, useState, useRef, useCallback } from 'react'
import { adminApi as api } from '../utils/adminApi.js'

// ── Status meta ───────────────────────────────────────────────────────────────
const STATUS = {
  active:               { label: 'Active',           color: '#3B82F6' },
  waiting_client:       { label: 'Waiting Client',   color: '#F59E0B' },
  ready_for_proposal:   { label: 'Ready for KP',     color: '#10B981' },
  proposal_sent:        { label: 'Proposal Sent',    color: '#8B5CF6' },
  closed:               { label: 'Closed',           color: '#6B7280' },
}

function Badge({ status, needs_human, ai_paused }) {
  const s = STATUS[status] || { label: status, color: '#6B7280' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        background: `${s.color}18`,
        color: s.color,
        border: `1px solid ${s.color}40`,
        borderRadius: 20,
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>{s.label}</span>
      {needs_human && <span style={{ fontSize: 10, color: '#F87171' }}>⚠ Human</span>}
      {ai_paused && !needs_human && <span style={{ fontSize: 10, color: '#6B7280' }}>⏸ AI Off</span>}
    </span>
  )
}

const TEMP_LABEL = { cold: '🔵 Cold', warm: '🟡 Warm', hot: '🔴 Hot' }
const TEMP_COLOR = { cold: '#6B7280', warm: '#F59E0B', hot: '#EF4444' }
const STAGE_COLOR = {
  new: '#6B7280', discovery: '#3B82F6', qualified: '#8B5CF6',
  proposal: '#10B981', negotiation: '#F59E0B',
  closing: '#EF4444', won: '#22C55E', lost: '#6B7280',
}

// ── Probability gauge ─────────────────────────────────────────────────────────
function ProbBar({ prob }) {
  const color = prob >= 60 ? '#22C55E' : prob >= 30 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${prob}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 700, minWidth: 26, textAlign: 'right' }}>{prob}%</span>
    </div>
  )
}

// ── Conversation list item ────────────────────────────────────────────────────
function ConvItem({ c, selected, onClick }) {
  const tempColor = TEMP_COLOR[c.client_temperature] || '#6B7280'
  const stageColor = STAGE_COLOR[c.decision_stage] || '#6B7280'
  return (
    <div onClick={onClick} style={{
      padding: '12px 14px',
      cursor: 'pointer',
      borderBottom: '1px solid var(--border)',
      background: selected ? 'var(--gold-dim)' : 'transparent',
      borderLeft: selected ? `2px solid var(--gold)` : `2px solid ${tempColor}`,
      transition: 'background 0.15s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
          {c.client_name || 'Unknown'}
        </span>
        <span style={{ fontSize: 10, color: tempColor, fontWeight: 700 }}>
          {TEMP_LABEL[c.client_temperature] || '—'}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 4 }}>{c.service}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <Badge status={c.status} needs_human={c.needs_human} ai_paused={c.ai_paused} />
        <span style={{
          fontSize: 9, background: `${stageColor}18`, color: stageColor,
          border: `1px solid ${stageColor}40`, borderRadius: 8, padding: '1px 6px',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>{c.decision_stage || 'new'}</span>
      </div>
      <ProbBar prob={c.deal_probability || 0} />
      {c.recommended_next_action && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
          → {c.recommended_next_action}
        </div>
      )}
    </div>
  )
}

// ── Chat message bubble ───────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isClient = msg.sender === 'client'
  const isAdmin = msg.sender === 'admin'
  const isSystem = msg.text.startsWith('[')

  if (isSystem) return (
    <div style={{ textAlign: 'center', margin: '8px 0' }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>{msg.text}</span>
    </div>
  )

  return (
    <div style={{
      display: 'flex',
      justifyContent: isClient ? 'flex-start' : 'flex-end',
      marginBottom: 8,
    }}>
      <div style={{
        maxWidth: '75%',
        background: isClient
          ? 'var(--bg-elevated)'
          : isAdmin
            ? 'rgba(59,130,246,0.15)'
            : 'var(--gold-dim)',
        border: isClient
          ? '1px solid var(--border)'
          : isAdmin
            ? '1px solid rgba(59,130,246,0.3)'
            : '1px solid var(--border-gold)',
        borderRadius: isClient ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        padding: '8px 12px',
      }}>
        {!isClient && (
          <div style={{ fontSize: 9, color: isAdmin ? '#60A5FA' : 'var(--gold)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {isAdmin ? 'Admin' : 'AI Agent'}
          </div>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {msg.text}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
    </div>
  )
}

// ── Deal Intelligence panel ───────────────────────────────────────────────────
function DealIntelligence({ d, onSetStage }) {
  const STAGES = ['new','discovery','qualified','proposal','negotiation','closing','won','lost']
  const tempColor = TEMP_COLOR[d.client_temperature] || '#6B7280'
  const stageColor = STAGE_COLOR[d.decision_stage] || '#6B7280'
  const riskColor = d.risk_level === 'high' ? '#EF4444' : d.risk_level === 'medium' ? '#F59E0B' : '#22C55E'

  const Metric = ({ label, value, color, sub }) => (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Deal Intelligence</div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <Metric label="Probability" value={`${d.deal_probability || 0}%`} color={d.deal_probability >= 60 ? '#22C55E' : d.deal_probability >= 30 ? '#F59E0B' : '#EF4444'} />
        <Metric label="Temperature" value={d.client_temperature || 'cold'} color={tempColor} />
        <Metric label="Risk" value={d.risk_level || 'medium'} color={riskColor} />
        <Metric label="Revenue" value={d.estimated_revenue ? `$${d.estimated_revenue.toLocaleString()}` : '—'} color="var(--gold)" />
      </div>

      {/* Completeness bar */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Requirements</span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700 }}>{d.requirements_completeness || 0}%</span>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${d.requirements_completeness || 0}%`, height: '100%', background: '#8B5CF6', borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* Budget confidence */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Budget Confidence</span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700 }}>{d.budget_confidence || 0}%</span>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${d.budget_confidence || 0}%`, height: '100%', background: 'var(--gold)', borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
        {d.budget_range && <div style={{ fontSize: 10, color: 'var(--gold)', marginTop: 4 }}>{d.budget_range}</div>}
      </div>

      {/* Stage + urgency */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Stage</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {STAGES.map(s => (
            <button key={s} onClick={() => onSetStage(s)} style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              cursor: 'pointer', border: `1px solid ${d.decision_stage === s ? STAGE_COLOR[s] : 'var(--border)'}`,
              background: d.decision_stage === s ? `${STAGE_COLOR[s]}20` : 'transparent',
              color: d.decision_stage === s ? STAGE_COLOR[s] : 'var(--text-muted)',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Next action */}
      {d.recommended_next_action && (
        <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 9, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Next Action</div>
          <div style={{ fontSize: 12, color: '#C4B5FD', fontWeight: 600 }}>→ {d.recommended_next_action}</div>
        </div>
      )}

      {/* Dates */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Forecast</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Urgency: <span style={{ color: d.urgency === 'high' ? '#EF4444' : d.urgency === 'medium' ? '#F59E0B' : '#6B7280', fontWeight: 600 }}>{d.urgency || 'low'}</span>
        </div>
        {d.estimated_close_date && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Est. close: {d.estimated_close_date}
          </div>
        )}
        {d.deadline && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Deadline: {d.deadline}
          </div>
        )}
        {d.is_stale && (
          <div style={{ marginTop: 4, fontSize: 10, color: '#F87171', fontWeight: 600 }}>⚠ STALE</div>
        )}
      </div>

      {/* Pain points & goals */}
      {(d.pain_points?.length > 0 || d.goals?.length > 0) && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
          {d.pain_points?.length > 0 && (
            <>
              <div style={{ fontSize: 9, color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Pain Points</div>
              {d.pain_points.slice(0, 2).map((p, i) => (
                <div key={i} style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>• {p.slice(0, 80)}</div>
              ))}
            </>
          )}
          {d.goals?.length > 0 && (
            <>
              <div style={{ fontSize: 9, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 6, marginBottom: 4 }}>Goals</div>
              {d.goals.slice(0, 2).map((g, i) => (
                <div key={i} style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>• {g.slice(0, 80)}</div>
              ))}
            </>
          )}
          {d.competitors?.length > 0 && (
            <>
              <div style={{ fontSize: 9, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 6, marginBottom: 4 }}>Competitors</div>
              {d.competitors.slice(0, 2).map((c, i) => (
                <div key={i} style={{ fontSize: 10, color: '#F59E0B', marginBottom: 2 }}>⚠ {c.slice(0, 60)}</div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Timeline panel ────────────────────────────────────────────────────────────
function Timeline({ events }) {
  if (!events || events.length === 0) return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
      No timeline events yet
    </div>
  )
  const EVENT_ICON = {
    lead_created: '🚀', discovery_started: '🔍', stage_change: '→',
    budget_identified: '💰', requirements_complete: '✅', proposal_generated: '📄',
    admin_takeover: '👤', ai_resumed: '🤖', admin_message: '💬',
    follow_up: '⏰', follow_up_1: '⏰', follow_up_2: '⏰', stale: '🚨',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {events.map((e, i) => (
        <div key={e.id} style={{ display: 'flex', gap: 10, paddingBottom: 10, position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
            <div style={{ fontSize: 13 }}>{EVENT_ICON[e.event_type] || '◎'}</div>
            {i < events.length - 1 && (
              <div style={{ width: 1, flex: 1, background: 'var(--border)', margin: '3px 0' }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>
              {e.created_at ? new Date(e.created_at).toLocaleString('ru-RU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{e.event_type?.replace(/_/g, ' ')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Requirements panel ────────────────────────────────────────────────────────
function Requirements({ reqs }) {
  if (!reqs || Object.keys(reqs).length === 0) return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
      Требования ещё не собраны
    </div>
  )
  const LABELS = {
    goal: 'Цель', users: 'Пол��зователи', features: 'Функции',
    integrations: 'Интеграции', timeline: 'Дедлайн', admin: 'Панель',
    design: 'Дизайн', success: 'Критерий успеха', examples: 'Референсы',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Object.entries(reqs).map(([k, v]) => (
        <div key={k} style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '6px 10px',
        }}>
          <div style={{ fontSize: 9, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            {LABELS[k] || k}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{String(v)}</div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Conversations() {
  const [convs, setConvs] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [msgText, setMsgText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [rightTab, setRightTab] = useState('reqs') // 'reqs' | 'brain' | 'timeline'
  const chatEndRef = useRef(null)

  const loadList = useCallback(async () => {
    try {
      const data = await api('GET', '/api/conversations')
      setConvs(data)
    } catch { }
    setLoading(false)
  }, [])

  const loadDetail = useCallback(async (id) => {
    try {
      const [data, tl] = await Promise.all([
        api('GET', `/api/conversations/${id}`),
        api('GET', `/api/conversations/${id}/timeline`),
      ])
      setDetail(data)
      setTimeline(tl)
    } catch { }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  useEffect(() => {
    if (selected) loadDetail(selected)
  }, [selected, loadDetail])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [detail?.messages?.length])

  const doAction = async (path, label, body) => {
    setActionLoading(label)
    try {
      await api('POST', path, body)
      await loadDetail(selected)
      await loadList()
    } catch (e) {
      alert(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const setStage = async (stage) => {
    await doAction(`/api/conversations/${selected}/set-stage`, `stage-${stage}`, { stage })
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!msgText.trim() || !selected) return
    setSendingMsg(true)
    try {
      await api('POST', `/api/conversations/${selected}/send-message`, { text: msgText.trim() })
      setMsgText('')
      await loadDetail(selected)
      await loadList()
    } catch (e) {
      alert(e.message)
    } finally {
      setSendingMsg(false)
    }
  }

  const btnStyle = (color, disabled) => ({
    background: disabled ? 'rgba(255,255,255,0.03)' : `${color}18`,
    border: `1px solid ${disabled ? 'var(--border)' : color + '40'}`,
    borderRadius: 7,
    padding: '6px 11px',
    color: disabled ? 'var(--text-muted)' : color,
    fontSize: 11,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
  })

  const activeCount = convs.filter(c => ['active', 'waiting_client'].includes(c.status)).length
  const humanCount  = convs.filter(c => c.needs_human).length
  const readyCount  = convs.filter(c => c.status === 'ready_for_proposal').length
  const hotCount    = convs.filter(c => c.client_temperature === 'hot').length

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: 0, animation: 'fadeIn 0.3s ease', overflow: 'hidden' }}>

      {/* ── Left panel: conversation list ── */}
      <div style={{
        width: 280,
        minWidth: 240,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', marginBottom: 8 }}>
            Conversations
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {activeCount > 0 && (
              <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '2px 7px' }}>
                {activeCount} active
              </span>
            )}
            {humanCount > 0 && (
              <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '2px 7px' }}>
                ⚠ {humanCount} human
              </span>
            )}
            {readyCount > 0 && (
              <span style={{ fontSize: 10, background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '2px 7px' }}>
                {readyCount} ready
              </span>
            )}
            {hotCount > 0 && (
              <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '2px 7px' }}>
                🔴 {hotCount} hot
              </span>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
          ) : convs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                No conversations yet.<br />Approve a purchase request to start.
              </div>
            </div>
          ) : (
            convs.map(c => (
              <ConvItem key={c.id} c={c} selected={selected === c.id} onClick={() => setSelected(c.id)} />
            ))
          )}
        </div>
        <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
          <button onClick={loadList} style={{ width: '100%', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* ── Right panel ── */}
      {!selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Select a conversation</div>
          </div>
        </div>
      ) : !detail ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading...
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
                {detail.client_name}
                {detail.telegram_chat_id && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 400 }}>
                    id:{detail.telegram_chat_id}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 1 }}>
                {detail.service} {detail.budget ? `· ${detail.budget}` : ''}
              </div>
            </div>
            <Badge status={detail.status} needs_human={detail.needs_human} ai_paused={detail.ai_paused} />
          </div>

          {/* Action bar */}
          <div style={{
            padding: '8px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}>
            <button
              style={btnStyle('#3B82F6', actionLoading === 'next' || detail.status === 'closed')}
              disabled={actionLoading === 'next' || detail.status === 'closed'}
              onClick={() => doAction(`/api/conversations/${selected}/send-next-question`, 'next')}
            >
              {actionLoading === 'next' ? '...' : '▶ Send AI Next Question'}
            </button>
            {!detail.ai_paused ? (
              <button
                style={btnStyle('#F59E0B', actionLoading === 'takeover')}
                disabled={actionLoading === 'takeover'}
                onClick={() => doAction(`/api/conversations/${selected}/take-over`, 'takeover')}
              >
                {actionLoading === 'takeover' ? '...' : '⏸ Take Over'}
              </button>
            ) : (
              <button
                style={btnStyle('#10B981', actionLoading === 'resume')}
                disabled={actionLoading === 'resume'}
                onClick={() => doAction(`/api/conversations/${selected}/resume-ai`, 'resume')}
              >
                {actionLoading === 'resume' ? '...' : '▶ Resume AI'}
              </button>
            )}
            <button
              style={btnStyle('#8B5CF6', actionLoading === 'proposal' || detail.status === 'closed')}
              disabled={actionLoading === 'proposal' || detail.status === 'closed'}
              onClick={() => doAction(`/api/conversations/${selected}/generate-proposal`, 'proposal')}
            >
              {actionLoading === 'proposal' ? '...' : '📄 Generate Proposal'}
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {['reqs','brain','timeline'].map(tab => (
                <button key={tab} onClick={() => setRightTab(tab)} style={{
                  ...btnStyle(rightTab === tab ? '#8B5CF6' : '#6B7280', false),
                  opacity: rightTab === tab ? 1 : 0.6,
                }}>
                  {tab === 'reqs' ? '◧ Reqs' : tab === 'brain' ? '🧠 Brain' : '⏱ Timeline'}
                </button>
              ))}
            </div>
          </div>

          {/* Body: chat + requirements */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Chat */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                {(detail.messages || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                    No messages yet
                  </div>
                ) : (
                  (detail.messages || []).map(m => <Bubble key={m.id} msg={m} />)
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Admin reply form */}
              <form onSubmit={sendMessage} style={{
                borderTop: '1px solid var(--border)',
                padding: '10px 14px',
                display: 'flex',
                gap: 8,
                flexShrink: 0,
              }}>
                <input
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  placeholder={detail.ai_paused ? 'Send manual message...' : 'Override — send manual message...'}
                  style={{
                    flex: 1,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="submit"
                  disabled={sendingMsg || !msgText.trim()}
                  style={{
                    background: sendingMsg || !msgText.trim() ? 'var(--bg-elevated)' : 'var(--gold-dim)',
                    border: '1px solid var(--border-gold)',
                    borderRadius: 8,
                    padding: '8px 14px',
                    color: sendingMsg || !msgText.trim() ? 'var(--text-muted)' : 'var(--gold)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: sendingMsg || !msgText.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sendingMsg ? '...' : 'Send'}
                </button>
              </form>
            </div>

            {/* Right sidebar — tabbed */}
            <div style={{
              width: 240,
              borderLeft: '1px solid var(--border)',
              overflowY: 'auto',
              padding: 12,
              flexShrink: 0,
            }}>
              {rightTab === 'reqs' && (
                <>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Extracted Requirements
                  </div>
                  <Requirements reqs={detail.extracted_requirements} />
                  {detail.summary && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                        Summary
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {detail.summary}
                      </div>
                    </div>
                  )}
                </>
              )}
              {rightTab === 'brain' && (
                <DealIntelligence d={detail} onSetStage={setStage} />
              )}
              {rightTab === 'timeline' && (
                <>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Conversation Timeline
                  </div>
                  <Timeline events={timeline} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
