import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { runCycle } from '../api/client.js'

const PAGE_TITLES = {
  '/dashboard': { title: 'Command Center', sub: 'Operational overview' },
  '/agents': { title: 'Agents Board', sub: 'Autonomous team' },
  '/tasks': { title: 'Task Manager', sub: 'Priorities & execution' },
  '/leads': { title: 'CRM / Leads', sub: 'Sales pipeline' },
  '/content': { title: 'Content Center', sub: 'Posts & publishing' },
  '/offers': { title: 'Offers Center', sub: 'Commercial proposals' },
  '/strategy': { title: 'Strategy Center', sub: 'Roadmap to WAIC 2027' },
  '/settings': { title: 'Settings', sub: 'Configuration' },
}

export default function Topbar() {
  const location = useLocation()
  const page = PAGE_TITLES[location.pathname] || { title: 'AUREON', sub: '' }
  const [running, setRunning] = useState(false)
  const [notification, setNotification] = useState(null)

  const handleRunCycle = async () => {
    setRunning(true)
    try {
      const result = await runCycle()
      setNotification({ type: 'success', msg: result.summary })
    } catch {
      setNotification({ type: 'info', msg: 'Цикл запущен (оффлайн режим — подключите backend)' })
    }
    setTimeout(() => setNotification(null), 4000)
    setRunning(false)
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Page title */}
      <div>
        <h1 style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'Space Grotesk',
        }}>{page.title}</h1>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{page.sub}</p>
      </div>

      {/* Center notification */}
      {notification && (
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          background: notification.type === 'success' ? 'var(--green-dim)' : 'var(--gold-dim)',
          border: `1px solid ${notification.type === 'success' ? 'rgba(16,185,129,0.3)' : 'var(--border-gold)'}`,
          color: notification.type === 'success' ? 'var(--green)' : 'var(--gold)',
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          maxWidth: '400px',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease',
        }}>
          {notification.msg}
        </div>
      )}

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>{timeStr}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{dateStr}</div>
        </div>

        <button
          onClick={handleRunCycle}
          disabled={running}
          style={{
            background: running
              ? 'rgba(212,175,55,0.1)'
              : 'linear-gradient(135deg, var(--gold), #B8960C)',
            color: running ? 'var(--gold)' : '#0A0A0B',
            border: running ? '1px solid var(--border-gold)' : 'none',
            padding: '7px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'Space Grotesk',
            letterSpacing: '0.03em',
            transition: 'all 0.2s ease',
            boxShadow: running ? 'none' : '0 0 12px var(--gold-glow)',
            cursor: running ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {running ? '⟳ Running...' : '▶ Run CEO Cycle'}
        </button>
      </div>
    </header>
  )
}
