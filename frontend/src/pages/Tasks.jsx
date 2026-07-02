import React, { useEffect, useState } from 'react'
import { getTasks, createTask } from '../api/client.js'
import { MOCK_TASKS } from '../api/mockData.js'
import TaskCard from '../components/TaskCard.jsx'
import Button from '../components/Button.jsx'

const AGENTS = ['CEO Agent', 'Sales Agent', 'Marketing Agent', 'Product Agent', 'Research Agent', 'Finance Agent', 'CTO Agent', 'Design Agent']

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', agent: 'CEO Agent', priority: 'medium' })

  const load = () => getTasks().then(setTasks).catch(() => setTasks(MOCK_TASKS))
  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  const stats = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    try { await createTask(form) } catch {}
    setForm({ title: '', agent: 'CEO Agent', priority: 'medium' })
    setShowForm(false)
    load()
  }

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ]

  return (
    <div style={{ maxWidth: 800, animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: filter === key ? '1px solid var(--border-gold)' : '1px solid var(--border)',
              background: filter === key ? 'var(--gold-dim)' : 'transparent',
              color: filter === key ? 'var(--gold)' : 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {label} <span style={{ opacity: 0.7 }}>({stats[key]})</span>
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={() => setShowForm(!showForm)} size="sm">
          + New Task
        </Button>
      </div>

      {/* New task form */}
      {showForm && (
        <form onSubmit={submit} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: '16px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Task title..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
            }}>
              {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
            }}>
              {['high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <Button variant="ghost" onClick={() => setShowForm(false)} size="sm">Cancel</Button>
              <Button variant="primary" size="sm" style={{ background: 'linear-gradient(135deg, var(--gold), #B8960C)', color: '#0A0A0B' }}>
                Create
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Tasks list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            padding: '40px',
            fontSize: '13px',
          }}>
            No tasks in this category
          </div>
        )}
        {filtered.map(task => (
          <TaskCard key={task.id} task={task} onUpdate={load} />
        ))}
      </div>
    </div>
  )
}
