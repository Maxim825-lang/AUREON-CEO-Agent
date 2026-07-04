import React, { useEffect, useState } from 'react'
import { getStrategy } from '../api/client.js'
import ProgressBar from '../components/ProgressBar.jsx'

const BASE_URL = import.meta.env.VITE_API_URL || ''

async function patchStrategy(data) {
  const r = await fetch(`${BASE_URL}/api/strategy`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('patch failed')
}

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

function GoalsList({ goals, accent, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')

  const handleAdd = async () => {
    const trimmed = input.trim()
    if (!trimmed) return
    await onAdd(trimmed)
    setInput('')
    setAdding(false)
  }

  const emptyStyle = {
    textAlign: 'center',
    padding: '20px 12px',
    color: 'var(--text-muted)',
    fontSize: '12px',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-sm)',
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-gold)',
    borderRadius: '6px',
    padding: '7px 10px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {goals.length === 0 && !adding && (
        <div style={emptyStyle}>No goals yet — add your first one</div>
      )}
      {goals.map((goal, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: '8px',
          padding: '7px 10px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          alignItems: 'flex-start',
        }}>
          <span style={{ color: accent, fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1 }}>{goal}</span>
          <button onClick={() => onRemove(i)} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: '11px', padding: '0 2px', flexShrink: 0, lineHeight: 1,
          }} title="Remove">✕</button>
        </div>
      ))}
      {adding && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Enter goal..."
            style={inputStyle}
          />
          <button onClick={handleAdd} style={{
            background: 'var(--gold-dim)', border: '1px solid var(--border-gold)',
            borderRadius: '6px', padding: '6px 12px', color: 'var(--gold)',
            fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>Add</button>
          <button onClick={() => setAdding(false)} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
            padding: '6px 10px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      )}
      {!adding && (
        <button onClick={() => setAdding(true)} style={{
          background: 'none', border: '1px dashed var(--border)',
          borderRadius: '6px', padding: '6px 10px', color: 'var(--text-muted)',
          fontSize: '12px', cursor: 'pointer', textAlign: 'left',
          transition: 'border-color 0.15s, color 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          + Add Goal
        </button>
      )}
    </div>
  )
}

export default function Strategy() {
  const [strategy, setStrategy] = useState(null)
  const [offline, setOffline] = useState(false)

  const load = () => getStrategy().then(s => { setStrategy(s); setOffline(false) }).catch(() => { setStrategy(null); setOffline(true) })
  useEffect(() => { load() }, [])

  const mutate = async (patch) => {
    await patchStrategy(patch)
    load()
  }

  const addWeeklyGoal = async (goal) => {
    const current = strategy.weekly_goals || []
    await mutate({ weekly_goals: [...current, goal] })
  }
  const removeWeeklyGoal = async (idx) => {
    const current = (strategy.weekly_goals || []).filter((_, i) => i !== idx)
    await mutate({ weekly_goals: current })
  }
  const addMonthlyGoal = async (goal) => {
    const current = strategy.monthly_goals || []
    await mutate({ monthly_goals: [...current, goal] })
  }
  const removeMonthlyGoal = async (idx) => {
    const current = (strategy.monthly_goals || []).filter((_, i) => i !== idx)
    await mutate({ monthly_goals: current })
  }

  if (!strategy) return (
    <div style={{ textAlign: 'center', padding: '60px', fontSize: '13px' }}>
      {offline ? (
        <div style={{
          color: 'var(--red)',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 24px',
          display: 'inline-block',
        }}>
          Backend offline — real data unavailable
        </div>
      ) : (
        <span style={{ color: 'var(--text-muted)' }}>Loading strategy...</span>
      )}
    </div>
  )

  const daysLeft = Math.floor((new Date('2027-07-01') - new Date()) / (1000 * 60 * 60 * 24))
  const revenueLabel = strategy.revenue_current > 0
    ? `$${strategy.revenue_current.toLocaleString()} / $${strategy.revenue_goal.toLocaleString()}`
    : `No revenue yet · Goal: $${(strategy.revenue_goal || 0).toLocaleString()}`

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
          position: 'absolute', right: -20, top: -20, width: 120, height: 120,
          background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ fontSize: '10px', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Main Goal
        </div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', marginBottom: '14px', maxWidth: 700 }}>
          {strategy.main_goal}
        </div>
        <ProgressBar value={strategy.progress_percent || 0} max={100} color="var(--gold)" height={5} showLabel label={revenueLabel} />
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{daysLeft}</span> days until WAIC 2027
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Weekly goals */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
          <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
            Weekly Goals
          </h3>
          <GoalsList
            goals={strategy.weekly_goals || []}
            accent="var(--gold)"
            onAdd={addWeeklyGoal}
            onRemove={removeWeeklyGoal}
          />
        </div>

        {/* Monthly goals */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
          <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
            Monthly Goals
          </h3>
          <GoalsList
            goals={strategy.monthly_goals || []}
            accent="var(--purple)"
            onAdd={addMonthlyGoal}
            onRemove={removeMonthlyGoal}
          />
        </div>
      </div>

      {/* Risks */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
          Risks & Mitigations
        </h3>
        {(strategy.risks || []).length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>No risks defined yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(strategy.risks || []).map((risk, i) => {
              const rc = RISK_COLORS[risk.level] || RISK_COLORS.medium
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '12px',
                  padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)', border: `1px solid ${rc.border}`, alignItems: 'start',
                }}>
                  <span style={{
                    fontSize: '9px', fontWeight: 600, color: rc.color, background: rc.bg,
                    padding: '3px 7px', borderRadius: '4px', textTransform: 'uppercase',
                    letterSpacing: '0.06em', width: 'fit-content',
                  }}>{risk.level}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4 }}>{risk.risk}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>→ {risk.mitigation}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* CEO Decisions */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
          CEO Decisions
        </h3>
        {(strategy.ceo_decisions || []).length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>No decisions recorded yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(strategy.ceo_decisions || []).map((dec, i) => (
              <div key={i} style={{
                padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{dec.decision}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{dec.date}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Why: {dec.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roadmap */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
        <h3 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
          Roadmap to WAIC 2027
        </h3>
        {(strategy.roadmap || []).length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>No roadmap defined</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {(strategy.roadmap || []).map((phase, i) => {
              const color = PHASE_COLORS[phase.status] || 'var(--text-muted)'
              const isActive = phase.status === 'active'
              return (
                <div key={i} style={{
                  background: isActive ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? 'var(--border-gold)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)', padding: '14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '9px', fontWeight: 600, color,
                      background: isActive ? 'var(--gold-dim)' : 'rgba(255,255,255,0.04)',
                      padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em',
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
        )}
      </div>
    </div>
  )
}
