import React from 'react'

const VARIANTS = {
  primary: {
    background: 'linear-gradient(135deg, var(--gold), #B8960C)',
    color: '#0A0A0B',
    border: 'none',
    boxShadow: '0 0 12px var(--gold-glow)',
  },
  secondary: {
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--red-dim)',
    color: 'var(--red)',
    border: '1px solid rgba(239,68,68,0.3)',
  },
  success: {
    background: 'var(--green-dim)',
    color: 'var(--green)',
    border: '1px solid rgba(16,185,129,0.3)',
  },
}

export default function Button({ children, variant = 'secondary', onClick, disabled = false, style = {}, size = 'md' }) {
  const v = VARIANTS[variant] || VARIANTS.secondary
  const padding = size === 'sm' ? '5px 12px' : size === 'lg' ? '10px 24px' : '7px 16px'
  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '14px' : '12px'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...v,
        padding,
        fontSize,
        fontWeight: 600,
        fontFamily: 'Space Grotesk',
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        letterSpacing: '0.02em',
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled) e.currentTarget.style.opacity = '0.85'
      }}
      onMouseLeave={e => {
        if (!disabled) e.currentTarget.style.opacity = '1'
      }}
    >
      {children}
    </button>
  )
}
