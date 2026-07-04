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

const STATUS_META = {
  new: { label: 'New', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  approved: { label: 'Approved', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  in_discovery: { label: 'Discovery', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  proposal_sent: { label: 'Proposal', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  won: { label: 'Won', color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
  lost: { label: 'Lost', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' }
  return (
    <span style={{
      background: meta.bg,
      color: meta.color,
      border: `1px solid ${meta.color}40`,
      borderRadius: 20,
      padding: '3px 10px',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>{meta.label}</span>
  )
}

function RequestCard({ req, onRefresh }) {
  const [loading, setLoading] = useState(null)
  const [caseId, setCaseId] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const action = async (path, label) => {
    setLoading(label)
    try {
      const res = await api('POST', path)
      if (res.case_id) setCaseId(res.case_id)
      onRefresh()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(null)
    }
  }

  const btnStyle = (color) => ({
    background: color ? `${color}18` : 'rgba(255,255,255,0.04)',
    border: `1px solid ${color || 'rgba(255,255,255,0.1)'}40`,
    borderRadius: 8,
    padding: '6px 12px',
    color: color || 'var(--text-secondary)',
    fontSize: 11,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    whiteSpace: 'nowrap',
  })

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 18,
      marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
            {req.name}
            {req.username && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>@{req.username}</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--gold)', marginTop: 2 }}>{req.service}</div>
        </div>
        <StatusBadge status={req.status} />
      </div>

      {/* Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, fontSize: 12 }}>
        {req.budget && (
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Бюджет: </span>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>{req.budget}</span>
          </div>
        )}
        {req.deadline && (
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Дедлайн: </span>
            <span style={{ color: 'var(--text-secondary)' }}>{req.deadline}</span>
          </div>
        )}
        {req.contact && (
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Контакт: </span>
            <span style={{ color: 'var(--text-secondary)' }}>{req.contact}</span>
          </div>
        )}
        <div>
          <span style={{ color: 'var(--text-muted)' }}>
            {req.created_at ? new Date(req.created_at).toLocaleDateString('ru-RU') : '—'}
          </span>
        </div>
      </div>

      {req.project_description && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          {expanded ? req.project_description : req.project_description.slice(0, 120)}
          {req.project_description.length > 120 && (
            <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 11, cursor: 'pointer', marginLeft: 4 }}>
              {expanded ? 'свернуть' : '...ещё'}
            </button>
          )}
        </div>
      )}

      {caseId && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#10B981', marginBottom: 10 }}>
          ✅ Кейс создан (ID {caseId}) — перейдите в Portfolio для публикации
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {req.status === 'new' && (
          <>
            <button style={btnStyle('#10B981')} disabled={!!loading}
              onClick={() => action(`/api/admin/purchase-requests/${req.id}/approve`, 'approve')}>
              {loading === 'approve' ? '...' : '✓ Approve'}
            </button>
            <button style={btnStyle('#EF4444')} disabled={!!loading}
              onClick={() => action(`/api/admin/purchase-requests/${req.id}/reject`, 'reject')}>
              {loading === 'reject' ? '...' : '✕ Reject'}
            </button>
          </>
        )}
        {['in_discovery', 'approved', 'proposal_sent'].includes(req.status) && (
          <button style={btnStyle('#D4AF37')} disabled={!!loading}
            onClick={() => action(`/api/admin/purchase-requests/${req.id}/mark-won`, 'won')}>
            {loading === 'won' ? '...' : '🏆 Mark Won'}
          </button>
        )}
        {req.status === 'won' && !caseId && (
          <button style={btnStyle('#8B5CF6')} disabled={!!loading}
            onClick={() => action(`/api/admin/purchase-requests/${req.id}/generate-portfolio-case`, 'case')}>
            {loading === 'case' ? '...' : '💼 Generate Portfolio Case'}
          </button>
        )}
        {req.lead_id && (
          <a href="/leads" style={{ ...btnStyle('#3B82F6'), textDecoration: 'none', display: 'inline-block' }}>
            → Lead #{req.lead_id}
          </a>
        )}
      </div>
    </div>
  )
}

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api('GET', '/api/admin/purchase-requests')
      setRequests(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  const counts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ maxWidth: 900, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', margin: 0 }}>
            Purchase Requests
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0' }}>
            Заявки через Telegram Mini App
          </p>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
          Всего: {requests.length} · Новых: {counts.new || 0}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'new', 'in_discovery', 'won', 'rejected'].map(s => {
          const meta = s === 'all' ? { label: 'Все', color: 'var(--gold)' } : STATUS_META[s]
          const count = s === 'all' ? requests.length : (counts[s] || 0)
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: filter === s ? `1px solid ${meta?.color || 'var(--gold)'}` : '1px solid var(--border)',
              background: filter === s ? `${meta?.color || 'var(--gold)'}18` : 'transparent',
              color: filter === s ? (meta?.color || 'var(--gold)') : 'var(--text-muted)',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 500,
            }}>
              {meta?.label || s} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 40,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📥</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Заявок пока нет
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Поделитесь ссылкой на Mini App, чтобы получить первые заявки
          </div>
        </div>
      ) : (
        filtered.map(r => <RequestCard key={r.id} req={r} onRefresh={load} />)
      )}
    </div>
  )
}
