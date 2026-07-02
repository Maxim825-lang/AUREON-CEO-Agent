import React, { useEffect, useState } from 'react'
import { getAgents } from '../api/client.js'
import { MOCK_AGENTS } from '../api/mockData.js'
import AgentCard from '../components/AgentCard.jsx'

export default function Agents() {
  const [agents, setAgents] = useState([])

  useEffect(() => {
    getAgents().then(setAgents).catch(() => setAgents(MOCK_AGENTS))
  }, [])

  const active = agents.filter(a => a.status === 'active')
  const idle = agents.filter(a => a.status !== 'active')

  return (
    <div style={{ maxWidth: 1100, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        {[
          { label: 'Total Agents', value: agents.length },
          { label: 'Active', value: active.length, color: 'var(--green)' },
          { label: 'Idle', value: idle.length, color: 'var(--text-muted)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>{value}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {active.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Active Agents
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {active.map(agent => <AgentCard key={agent.id} agent={agent} />)}
          </div>
        </div>
      )}

      {idle.length > 0 && (
        <div>
          <h3 style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Standby Agents
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {idle.map(agent => <AgentCard key={agent.id} agent={agent} />)}
          </div>
        </div>
      )}
    </div>
  )
}
