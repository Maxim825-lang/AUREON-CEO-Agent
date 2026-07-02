import React from 'react'

const STATUS_COLORS = {
  active: { bg: 'var(--green-dim)', border: 'rgba(16,185,129,0.2)', text: 'var(--green)', dot: true },
  idle: { bg: 'rgba(255,255,255,0.03)', border: 'var(--border)', text: 'var(--text-muted)', dot: false },
  busy: { bg: 'var(--orange-dim)', border: 'rgba(245,158,11,0.2)', text: 'var(--orange)', dot: true },
  error: { bg: 'var(--red-dim)', border: 'rgba(239,68,68,0.2)', text: 'var(--red)', dot: false },
}

export default function AgentCard({ agent }) {
  const sc = STATUS_COLORS[agent.status] || STATUS_COLORS.idle

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px',
      transition: 'all 0.2s ease',
      cursor: 'default',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = `${agent.color}40`
      e.currentTarget.style.background = 'var(--bg-card-hover)'
      e.currentTarget.style.transform = 'translateY(-1px)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border)'
      e.currentTarget.style.background = 'var(--bg-card)'
      e.currentTarget.style.transform = 'translateY(0)'
    }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36,
            height: 36,
            background: `${agent.color}18`,
            border: `1px solid ${agent.color}30`,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}>
            {agent.icon}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
              {agent.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{agent.role}</div>
          </div>
        </div>
        <div style={{
          background: sc.bg,
          border: `1px solid ${sc.border}`,
          borderRadius: '20px',
          padding: '3px 8px',
          fontSize: '10px',
          color: sc.text,
          fontWeight: 500,
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          textTransform: 'uppercase',
        }}>
          {sc.dot && <span className="status-dot active" style={{ width: '5px', height: '5px' }} />}
          {agent.status}
        </div>
      </div>

      {/* Current task */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
        marginBottom: '10px',
      }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Current Task
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {agent.current_task || '—'}
        </div>
      </div>

      {/* Last result */}
      {agent.last_result && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '10px' }}>
          {agent.last_result}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Completed: <span style={{ color: agent.color, fontWeight: 600 }}>{agent.tasks_completed}</span>
        </span>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: agent.color,
          boxShadow: agent.status === 'active' ? `0 0 8px ${agent.color}` : 'none',
        }} />
      </div>
    </div>
  )
}
