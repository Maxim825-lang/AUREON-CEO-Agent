import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { path: '/agents', icon: '◈', label: 'Agents' },
  { path: '/tasks', icon: '◻', label: 'Tasks' },
  { path: '/leads', icon: '◎', label: 'Leads' },
  { path: '/content', icon: '◧', label: 'Content' },
  { path: '/offers', icon: '◈', label: 'Offers' },
  { path: '/strategy', icon: '◬', label: 'Strategy' },
  { path: '/settings', icon: '◉', label: 'Settings' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, var(--gold), #B8960C)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 700,
            color: '#0A0A0B',
            fontFamily: 'Space Grotesk',
            boxShadow: '0 0 16px var(--gold-glow)',
          }}>A</div>
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--gold)',
              letterSpacing: '0.08em',
              fontFamily: 'Space Grotesk',
            }}>AUREON</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>CEO AGENT</div>
          </div>
        </div>
      </div>

      {/* Status pill */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{
          background: 'var(--green-dim)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '20px',
          padding: '5px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span className="status-dot active" style={{ width: '6px', height: '6px' }} />
          <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 500 }}>AGENT ACTIVE</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
                background: isActive ? 'var(--gold-dim)' : 'transparent',
                border: isActive ? '1px solid var(--border-gold)' : '1px solid transparent',
                transition: 'all 0.15s ease',
                fontSize: '13px',
                fontWeight: isActive ? 500 : 400,
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <span style={{ fontSize: '15px', opacity: 0.8 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '14px 16px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.05em' }}>
          AUREON v1.0 · 2026
        </div>
      </div>
    </aside>
  )
}
