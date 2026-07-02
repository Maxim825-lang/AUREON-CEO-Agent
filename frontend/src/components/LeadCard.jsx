import React from 'react'
import { updateLeadStatus } from '../api/client.js'

const STATUS_MAP = {
  new: { label: 'New', color: 'var(--blue)', bg: 'var(--blue-dim)' },
  contacted: { label: 'Contacted', color: 'var(--gold)', bg: 'var(--gold-dim)' },
  proposal_sent: { label: 'Proposal Sent', color: 'var(--purple)', bg: 'var(--purple-dim)' },
  negotiating: { label: 'Negotiating', color: 'var(--orange)', bg: 'var(--orange-dim)' },
  closed_won: { label: 'Won ✓', color: 'var(--green)', bg: 'var(--green-dim)' },
  closed_lost: { label: 'Lost', color: 'var(--red)', bg: 'var(--red-dim)' },
}

const STATUSES = Object.keys(STATUS_MAP)

export default function LeadCard({ lead, onUpdate }) {
  const st = STATUS_MAP[lead.status] || STATUS_MAP.new
  const scoreColor = lead.score >= 80 ? 'var(--green)' : lead.score >= 60 ? 'var(--gold)' : 'var(--text-muted)'

  const nextStatus = () => {
    const idx = STATUSES.indexOf(lead.status)
    return STATUSES[(idx + 1) % STATUSES.length]
  }

  const advance = async () => {
    try { await updateLeadStatus(lead.id, nextStatus()) } catch {}
    onUpdate && onUpdate()
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)'
      e.currentTarget.style.background = 'var(--bg-card-hover)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border)'
      e.currentTarget.style.background = 'var(--bg-card)'
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
            {lead.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {lead.company} · {lead.niche}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: scoreColor }}>{lead.score}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>score</div>
          </div>
          <div style={{
            background: st.bg,
            color: st.color,
            border: `1px solid ${st.color}30`,
            borderRadius: '20px',
            padding: '3px 8px',
            fontSize: '10px',
            fontWeight: 500,
          }}>{st.label}</div>
        </div>
      </div>

      <div style={{
        fontSize: '11px',
        color: 'var(--text-muted)',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 10px',
        marginBottom: '10px',
        lineHeight: 1.5,
      }}>
        <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Problem:</strong>
        {lead.problem}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>AUREON Offer</div>
        <div style={{ fontSize: '12px', color: 'var(--gold)' }}>{lead.aureon_offer}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
          ${lead.estimated_price?.toLocaleString()}
        </div>
        <button onClick={advance} style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          padding: '5px 12px',
          borderRadius: '6px',
          fontSize: '11px',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--border-gold)'
          e.currentTarget.style.color = 'var(--gold)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
        >
          Advance →
        </button>
      </div>
    </div>
  )
}
