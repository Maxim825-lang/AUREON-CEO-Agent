import React from 'react'
import { updateTaskStatus, deleteTask } from '../api/client.js'

const PRIORITY_STYLE = {
  high: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'HIGH' },
  medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'MED' },
  low: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', label: 'LOW' },
}

const STATUS_STYLE = {
  completed: { color: 'var(--green)', bg: 'var(--green-dim)', label: 'Done' },
  in_progress: { color: 'var(--gold)', bg: 'var(--gold-dim)', label: 'Active' },
  pending: { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)', label: 'Pending' },
}

export default function TaskCard({ task, onUpdate }) {
  const pr = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
  const st = STATUS_STYLE[task.status] || STATUS_STYLE.pending

  const cycle = async () => {
    const next = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'pending'
    try {
      await updateTaskStatus(task.id, next)
    } catch {}
    onUpdate && onUpdate()
  }

  const remove = async () => {
    try { await deleteTask(task.id) } catch {}
    onUpdate && onUpdate()
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      transition: 'border-color 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Status toggle */}
      <button onClick={cycle} style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: `2px solid ${task.status === 'completed' ? 'var(--green)' : 'rgba(255,255,255,0.2)'}`,
        background: task.status === 'completed' ? 'var(--green-dim)' : 'transparent',
        flexShrink: 0,
        marginTop: '1px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: 'var(--green)',
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}>
        {task.status === 'completed' && '✓'}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
          marginBottom: '4px',
        }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{task.agent}</span>
          <span style={{ color: 'var(--border)', fontSize: '10px' }}>·</span>
          <span style={{
            fontSize: '9px',
            fontWeight: 600,
            color: pr.color,
            background: pr.bg,
            padding: '2px 5px',
            borderRadius: '4px',
            letterSpacing: '0.04em',
          }}>{pr.label}</span>
          <span style={{
            fontSize: '9px',
            color: st.color,
            background: st.bg,
            padding: '2px 6px',
            borderRadius: '4px',
          }}>{st.label}</span>
          {Array.isArray(task.tags) && task.tags.map(t => (
            <span key={t} style={{
              fontSize: '9px',
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.04)',
              padding: '2px 5px',
              borderRadius: '4px',
            }}>#{t}</span>
          ))}
        </div>
      </div>

      <button onClick={remove} style={{
        color: 'var(--text-muted)',
        fontSize: '14px',
        padding: '2px 4px',
        borderRadius: '4px',
        transition: 'color 0.15s',
        cursor: 'pointer',
        flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >×</button>
    </div>
  )
}
