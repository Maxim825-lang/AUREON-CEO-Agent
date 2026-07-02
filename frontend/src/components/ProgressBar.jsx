import React from 'react'

export default function ProgressBar({ value = 0, max = 100, color = 'var(--gold)', height = 4, showLabel = false, label = '' }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div>
      {(showLabel || label) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{
        width: '100%',
        height: `${height}px`,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: `${height}px`,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}99)`,
          borderRadius: `${height}px`,
          transition: 'width 0.6s ease',
          boxShadow: `0 0 8px ${color}60`,
        }} />
      </div>
    </div>
  )
}
