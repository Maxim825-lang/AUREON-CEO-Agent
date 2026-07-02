import React from 'react'

const AGENT_COLORS = {
  'CEO Agent': '#D4AF37',
  'Sales Agent': '#3B82F6',
  'Marketing Agent': '#8B5CF6',
  'Research Agent': '#F59E0B',
  'Finance Agent': '#EF4444',
  'CTO Agent': '#6B7280',
  'Product Agent': '#10B981',
  'Design Agent': '#EC4899',
}

function timeAgo(dateStr) {
  if (!dateStr) return 'just now'
  const now = new Date()
  const then = new Date(dateStr)
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return then.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function ActivityFeed({ actions = [], limit = 8 }) {
  const items = actions.slice(0, limit)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {items.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px' }}>
          No actions yet. Run CEO Cycle to start.
        </div>
      )}
      {items.map((action, i) => {
        const color = AGENT_COLORS[action.agent] || '#6B7280'
        return (
          <div key={action.id || i} style={{
            display: 'flex',
            gap: '10px',
            padding: '10px 0',
            borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            animation: 'fadeIn 0.25s ease',
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: `${color}18`,
              border: `1px solid ${color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color,
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {action.agent?.charAt(0) || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color, fontFamily: 'Space Grotesk' }}>
                  {action.agent}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {timeAgo(action.created_at)}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                {action.action}
              </div>
              {action.result && (
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '5px',
                  padding: '5px 8px',
                  lineHeight: 1.4,
                }}>
                  {action.result}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
