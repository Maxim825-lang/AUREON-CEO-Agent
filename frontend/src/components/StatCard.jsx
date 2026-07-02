import React from 'react'

export default function StatCard({ label, value, sub, icon, color = 'var(--gold)', glow = false, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      transition: 'border-color 0.2s, background 0.2s',
      cursor: 'default',
      ...style,
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'
      e.currentTarget.style.background = 'var(--bg-card-hover)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border)'
      e.currentTarget.style.background = 'var(--bg-card)'
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>
          {label}
        </span>
        {icon && (
          <span style={{
            fontSize: '16px',
            filter: glow ? `drop-shadow(0 0 6px ${color})` : 'none',
          }}>{icon}</span>
        )}
      </div>
      <div style={{
        fontSize: '26px',
        fontWeight: 700,
        color: color,
        fontFamily: 'Space Grotesk',
        lineHeight: 1,
        marginBottom: '6px',
        textShadow: glow ? `0 0 20px ${color}40` : 'none',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>
      )}
    </div>
  )
}
