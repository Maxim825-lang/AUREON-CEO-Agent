import React, { useState } from 'react'
import { updateOfferStatus } from '../api/client.js'

const STATUS_MAP = {
  draft: { label: 'Draft', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)' },
  sent: { label: 'Sent', color: 'var(--blue)', bg: 'var(--blue-dim)' },
  viewed: { label: 'Viewed', color: 'var(--gold)', bg: 'var(--gold-dim)' },
  accepted: { label: 'Accepted ✓', color: 'var(--green)', bg: 'var(--green-dim)' },
  rejected: { label: 'Rejected', color: 'var(--red)', bg: 'var(--red-dim)' },
}

export default function OfferCard({ offer, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const st = STATUS_MAP[offer.status] || STATUS_MAP.draft

  const markSent = async () => {
    try { await updateOfferStatus(offer.id, 'sent') } catch {}
    onUpdate && onUpdate()
  }

  const copy = () => {
    navigator.clipboard.writeText(offer.content || '')
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
              {offer.client}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{offer.service}</div>
          </div>
          <div style={{
            background: st.bg,
            color: st.color,
            border: `1px solid ${st.color}30`,
            borderRadius: '20px',
            padding: '3px 8px',
            fontSize: '10px',
            fontWeight: 500,
            height: 'fit-content',
          }}>{st.label}</div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Price</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'Space Grotesk' }}>
              ${offer.price?.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Timeline</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{offer.timeline}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setExpanded(!expanded)} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
          }}>
            {expanded ? 'Hide' : 'View'} Offer
          </button>
          <button onClick={copy} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
          }}>Copy</button>
          {offer.status === 'draft' && (
            <button onClick={markSent} style={{
              background: 'var(--blue-dim)',
              border: '1px solid rgba(59,130,246,0.3)',
              color: 'var(--blue)',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}>Mark Sent</button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '14px 16px',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <pre style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {offer.content}
          </pre>
        </div>
      )}
    </div>
  )
}
