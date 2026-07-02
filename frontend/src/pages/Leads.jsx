import React, { useEffect, useState } from 'react'
import { getLeads, createLead } from '../api/client.js'
import { MOCK_LEADS } from '../api/mockData.js'
import LeadCard from '../components/LeadCard.jsx'
import Button from '../components/Button.jsx'

const STATUS_OPTIONS = ['new', 'contacted', 'proposal_sent', 'negotiating', 'closed_won', 'closed_lost']

const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  proposal_sent: 'Proposal Sent',
  negotiating: 'Negotiating',
  closed_won: 'Won',
  closed_lost: 'Lost',
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', niche: '', problem: '', aureon_offer: '', estimated_price: '' })

  const load = () => getLeads().then(setLeads).catch(() => setLeads(MOCK_LEADS))
  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  const totalValue = filtered.reduce((s, l) => s + (l.estimated_price || 0), 0)
  const avgScore = filtered.length ? Math.round(filtered.reduce((s, l) => s + (l.score || 0), 0) / filtered.length) : 0

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      await createLead({ ...form, estimated_price: parseFloat(form.estimated_price) || 0 })
    } catch {}
    setShowForm(false)
    setForm({ name: '', company: '', niche: '', problem: '', aureon_offer: '', estimated_price: '' })
    load()
  }

  return (
    <div style={{ maxWidth: 1100, animation: 'fadeIn 0.3s ease' }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Leads', value: leads.length, color: 'var(--text-primary)' },
          { label: 'Pipeline Value', value: `$${leads.reduce((s, l) => s + (l.estimated_price || 0), 0).toLocaleString()}`, color: 'var(--gold)' },
          { label: 'Avg Score', value: leads.length ? Math.round(leads.reduce((s, l) => s + (l.score || 0), 0) / leads.length) : 0, color: 'var(--green)' },
          { label: 'Won', value: leads.filter(l => l.status === 'closed_won').length, color: 'var(--green)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color, fontFamily: 'Space Grotesk' }}>{value}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <Button variant="primary" onClick={() => setShowForm(!showForm)} size="sm">+ Add Lead</Button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={submit} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: '16px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            {[
              { key: 'name', placeholder: 'Name / Channel *' },
              { key: 'company', placeholder: 'Company' },
              { key: 'niche', placeholder: 'Niche' },
              { key: 'estimated_price', placeholder: 'Estimated price ($)' },
            ].map(({ key, placeholder }) => (
              <input key={key}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            ))}
          </div>
          {[
            { key: 'problem', placeholder: 'Problem / pain point...' },
            { key: 'aureon_offer', placeholder: 'AUREON offer for this lead...' },
          ].map(({ key, placeholder }) => (
            <textarea key={key}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              rows={2}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none',
                resize: 'none',
                marginBottom: '10px',
                display: 'block',
              }}
            />
          ))}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowForm(false)} size="sm">Cancel</Button>
            <Button variant="primary" size="sm">Add Lead</Button>
          </div>
        </form>
      )}

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['all', ...STATUS_OPTIONS].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '4px 10px',
            borderRadius: '6px',
            border: filter === s ? '1px solid var(--border-gold)' : '1px solid var(--border)',
            background: filter === s ? 'var(--gold-dim)' : 'transparent',
            color: filter === s ? 'var(--gold)' : 'var(--text-muted)',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
            {' '}({s === 'all' ? leads.length : leads.filter(l => l.status === s).length})
          </button>
        ))}
      </div>

      {/* Leads grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
        {filtered.map(lead => (
          <LeadCard key={lead.id} lead={lead} onUpdate={load} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '40px', fontSize: '13px' }}>
            No leads in this category
          </div>
        )}
      </div>
    </div>
  )
}
