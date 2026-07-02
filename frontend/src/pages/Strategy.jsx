import React, { useEffect, useState } from 'react'
import { getStrategy } from '../api/client.js'
import { MOCK_STRATEGY } from '../api/mockData.js'
import ProgressBar from '../components/ProgressBar.jsx'

const RISK_COLORS = {
  high: { color: 'var(--red)', bg: 'var(--red-dim)', border: 'rgba(239,68,68,0.2)' },
  medium: { color: 'var(--orange)', bg: 'var(--orange-dim)', border: 'rgba(245,158,11,0.2)' },
  low: { color: 'var(--green)', bg: 'var(--green-dim)', border: 'rgba(16,185,129,0.2)' },
}

const PHASE_COLORS = {
  active: 'var(--gold)',
  planned: 'var(--text-muted)',
  completed: 'var(--green)',
}

export default function Strategy() {
  const [strategy, setStrategy] = useState(null)

  useEffect(() => {
    getStrategy().then(setStrategy).catch(() => setStrategy(MOCK_STRATEGY))
  }, [])

  if (!strategy) return (
    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px', fontSize: '13px' }}>
      Loading strategy...
    </div>
  )

  const daysLeft = Math.floor((new Date('2027-07-01') - new Date()) / (1000 * 60 * 60 * 24))

  return (
    <div style={{ maxWidth: 1100, animation: 'fadeIn 0.3s ease' }}>
      {/* Main goal banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.03))',
        border: '1px solid var(--border-gold)',
        borderRadius: 'var(--radius-xl)',
        padding: '22px 26px',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          right: -20,
          top: -20,
          width: 120,
          height: 120,
          background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ fontSize: '10px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Main Goal
        </div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', marginBottom: '14px', maxWidth: 700 }}>
          {strategy.main_goal}
        </div>
        <ProgressBar value={strategy.progress_percent} max={100} color="var(--gold)" height={5} showLabel label={`Progress · $${(strategy.revenue_current || 0).toLocaleString()} / $${(strategy.revenue_goal || 0).toLocaleString()}`} />
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{daysLeft}</span> days until WAIC 2027
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Weekly goals */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
        }}>
          <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
            Weekly Goals
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {(strategy.weekly_goals || []).map((goal, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '8px',
                padding: '7px 10px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}>
                <span style={{ color: 'var(--gold)', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{goal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly goals */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
        }}>
          <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
            Monthly Goals
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {(strategy.monthly_goals || []).map((goal, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '8px',
                padding: '7px 10px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}>
                <span style={{ color: 'var(--purple)', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>→</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{goal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risks */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px',
        marginBottom: '16px',
      }}>
        <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
          Risks & Mitigations
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(strategy.risks || []).map((risk, i) => {
            const rc = RISK_COLORS[risk.level] || RISK_COLORS.medium
            return (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 1fr',
                gap: '12px',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${rc.border}`,
                alignItems: 'start',
              }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  color: rc.color,
                  background: rc.bg,
                  padding: '3px 7px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  width: 'fit-content',
                }}>{risk.level}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{risk.risk}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>→ {risk.mitigation}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* CEO Decisions */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px',
        marginBottom: '16px',
      }}>
        <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
          CEO Decisions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(strategy.ceo_decisions || []).map((dec, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--gold)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{dec.decision}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{dec.date}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Why: {dec.reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px',
      }}>
        <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
          Roadmap to WAIC 2027
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {(strategy.roadmap || []).map((phase, i) => {
            const color = PHASE_COLORS[phase.status] || 'var(--text-muted)'
            const isActive = phase.status === 'active'
            return (
              <div key={i} style={{
                background: isActive ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? 'var(--border-gold)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    color,
                    background: isActive ? 'var(--gold-dim)' : 'rgba(255,255,255,0.04)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>{phase.status}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: isActive ? 'var(--gold)' : 'var(--text-secondary)', fontFamily: 'Space Grotesk', marginBottom: '2px' }}>
                  {phase.phase}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '10px' }}>{phase.period}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(phase.items || []).map((item, j) => (
                    <div key={j} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                      <span style={{ color, fontSize: '11px', flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
