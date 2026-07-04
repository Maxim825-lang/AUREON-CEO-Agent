import React, { useEffect, useState } from 'react'
import { getState, getActions, getTasks, getAgents, getPipelineStats } from '../api/client.js'
import { MOCK_STATE, MOCK_ACTIONS, MOCK_TASKS, MOCK_AGENTS } from '../api/mockData.js'
import StatCard from '../components/StatCard.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import ActivityFeed from '../components/ActivityFeed.jsx'

function WaicCountdown({ days }) {
  const yrs = Math.floor(days / 365)
  const mos = Math.floor((days % 365) / 30)
  const d = days % 30
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      {[{ v: yrs, l: 'years' }, { v: mos, l: 'months' }, { v: d, l: 'days' }].map(({ v, l }) => (
        <div key={l} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          textAlign: 'center',
          minWidth: 58,
        }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'Space Grotesk' }}>{v}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [state, setState] = useState(null)
  const [actions, setActions] = useState([])
  const [tasks, setTasks] = useState([])
  const [agents, setAgents] = useState([])
  const [pipeline, setPipeline] = useState(null)
  const [offline, setOffline] = useState(false)

  const load = async () => {
    try {
      const [s, a, t, ag] = await Promise.all([getState(), getActions(10), getTasks(), getAgents()])
      setState(s)
      setActions(a)
      setTasks(t)
      setAgents(ag)
      setOffline(false)
      getPipelineStats().then(setPipeline).catch(() => {})
    } catch {
      setState(MOCK_STATE)
      setActions(MOCK_ACTIONS)
      setTasks(MOCK_TASKS)
      setAgents(MOCK_AGENTS)
      setOffline(true)
    }
  }

  useEffect(() => { load() }, [])

  if (!state) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--gold)', fontSize: '13px', animation: 'pulse-gold 1.5s infinite' }}>
        Initializing AUREON...
      </div>
    </div>
  )

  const todayTasks = tasks.filter(t => t.status !== 'completed').slice(0, 5)
  const activeAgents = agents.filter(a => a.status === 'active').slice(0, 3)
  const revenueProgress = state.revenue_goal > 0 ? (state.revenue_current / state.revenue_goal) * 100 : 0

  return (
    <div style={{ maxWidth: 1200, animation: 'fadeIn 0.3s ease' }}>
      {offline && (
        <div style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 14px',
          fontSize: '11px',
          color: 'var(--red)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⚠</span>
          Backend offline — реальные данные недоступны.
          Запустите: <code style={{ fontFamily: 'monospace', opacity: 0.8, marginLeft: 4 }}>cd backend && source venv/bin/activate && uvicorn main:app --reload</code>
        </div>
      )}

      {/* Executive Summary */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)',
        border: '1px solid var(--border-gold)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px 28px',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                background: 'var(--green-dim)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '20px',
                padding: '3px 10px',
                fontSize: '10px',
                color: 'var(--green)',
                fontWeight: 600,
                letterSpacing: '0.08em',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}>
                <span className="status-dot active" style={{ width: '5px', height: '5px' }} />
                AGENT {state.status}
              </div>
            </div>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'Space Grotesk',
              marginBottom: '4px',
            }}>
              Доброе утро, {state.founder_name} 👋
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 500 }}>
              {state.focus_of_day}
            </p>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Until WAIC 2027
            </div>
            <WaicCountdown days={state.days_until_waic} />
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <ProgressBar
            value={state.progress_percent}
            max={100}
            color="var(--gold)"
            height={5}
            showLabel
            label={`AUREON Progress · $${state.revenue_current.toLocaleString()} / $${state.revenue_goal.toLocaleString()}`}
          />
        </div>
      </div>

      {/* Revenue Pipeline */}
      {pipeline && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(16,185,129,0.01))',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
              Revenue Pipeline
            </div>
            <a href="/leads" style={{ fontSize: '11px', color: 'var(--green)', textDecoration: 'none' }}>Manage Leads →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '10px' }}>
            {[
              { label: 'Potential', value: `$${(pipeline.total_potential_revenue || 0).toLocaleString()}`, color: 'var(--gold)' },
              { label: 'Won Revenue', value: `$${(pipeline.won_revenue || 0).toLocaleString()}`, color: 'var(--green)' },
              { label: 'Contacted', value: pipeline.contacted ?? 0, color: 'var(--blue)' },
              { label: 'Proposals', value: pipeline.proposals_sent ?? 0, color: 'var(--purple)' },
              { label: 'Won Deals', value: pipeline.won_deals ?? 0, color: 'var(--green)' },
              { label: 'Conversion', value: `${pipeline.conversion_rate ?? 0}%`, color: pipeline.conversion_rate > 20 ? 'var(--green)' : 'var(--gold)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>{label}</div>
                <div style={{ fontSize: '17px', fontWeight: 700, color, fontFamily: 'Space Grotesk' }}>{value}</div>
              </div>
            ))}
          </div>
          {pipeline.next_best_action && (
            <div style={{
              background: 'rgba(16,185,129,0.07)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '6px',
              padding: '7px 12px',
              fontSize: '11px',
              color: 'var(--green)',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}>
              <span style={{ opacity: 0.7 }}>▶</span>
              <span><b>Next money action:</b> {pipeline.next_best_action}</span>
            </div>
          )}
          {pipeline.real_leads === 0 && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
              Реальных лидов пока нет — перейдите в <a href="/leads" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Leads</a>, чтобы добавить первого.
            </div>
          )}
        </div>
      )}

      {/* Stat cards row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <StatCard label="Agents Active" value={`${state.active_agents}/${state.total_agents}`} icon="◈" color="var(--green)" glow />
        <StatCard label="Tasks Today" value={state.pending_tasks} sub="pending" icon="◻" />
        <StatCard label="Completed" value={state.completed_tasks} sub="total done" icon="✓" color="var(--green)" />
        <StatCard label="Risk Level" value={state.risk_level} icon="◬" color={state.risk_level === 'HIGH' ? 'var(--red)' : state.risk_level === 'MEDIUM' ? 'var(--orange)' : 'var(--green)'} />
        <StatCard label="Revenue" value={`$${state.revenue_current}`} sub={`goal: $${(state.revenue_goal/1000).toFixed(0)}K`} icon="💰" color="var(--gold)" glow />
        <StatCard label="Progress" value={`${state.progress_percent}%`} icon="◬" color="var(--gold)" />
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Today's tasks */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
              Today's Priorities
            </h3>
            <a href="/tasks" style={{ fontSize: '11px', color: 'var(--gold)', textDecoration: 'none' }}>View all →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todayTasks.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>
                All tasks completed ✓
              </div>
            )}
            {todayTasks.map((task, i) => (
              <div key={task.id || i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: task.priority === 'high' ? 'var(--red)' : task.priority === 'medium' ? 'var(--gold)' : 'var(--green)',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{task.title}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{task.agent?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active agents */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
              Active Agents
            </h3>
            <a href="/agents" style={{ fontSize: '11px', color: 'var(--gold)', textDecoration: 'none' }}>View all →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeAgents.map((agent, i) => (
              <div key={agent.id || i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '16px' }}>{agent.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: agent.color }}>{agent.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {agent.current_task}
                  </div>
                </div>
                <span className="status-dot active" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity feed + Next moves */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', marginBottom: '14px' }}>
            Agent Activity
          </h3>
          <ActivityFeed actions={actions} limit={6} />
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', marginBottom: '14px' }}>
            Next Moves
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(pipeline ? [
              pipeline.real_leads_count === 0 && { n: 1, text: 'Добавьте первого реального лида → раздел Leads', tag: 'Sales' },
              !pipeline.telegram_connected && { n: 2, text: 'Настройте Telegram-канал → Settings', tag: 'Telegram' },
              pipeline.next_best_action && { n: 3, text: pipeline.next_best_action, tag: 'Next' },
              { n: 4, text: 'Сгенерируйте sales-пост → Content', tag: 'Content' },
              { n: 5, text: 'Проверьте roadmap WAIC 2027 → Strategy', tag: 'Strategy' },
            ] : [
              { n: 1, text: 'Запустите backend для получения реальных данных', tag: 'System' },
              { n: 2, text: 'Добавьте реальных лидов в CRM', tag: 'Sales' },
              { n: 3, text: 'Настройте Telegram-канал в Settings', tag: 'Telegram' },
              { n: 4, text: 'Запустите Automation для работы 24/7', tag: 'Auto' },
              { n: 5, text: 'Откройте Services — посмотрите прайс', tag: 'Services' },
            ]).filter(Boolean).map(({ n, text, tag }) => (
              <div key={n} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}>
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--gold-dim)',
                  border: '1px solid var(--border-gold)',
                  color: 'var(--gold)',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>{n}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{text}</span>
                <span style={{
                  fontSize: '9px',
                  color: 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
