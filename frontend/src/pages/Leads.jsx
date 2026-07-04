import React, { useEffect, useState, useCallback } from 'react'
import {
  getLeads, createLead, updateLeadStatus,
  findRealLeads, generateOutreach, generateOfferForLead, getPipelineStats,
  markLeadContacted, markLeadProposalSent, markLeadWon, markLeadLost,
} from '../api/client.js'
import Button from '../components/Button.jsx'

const STATUS_OPTIONS = ['new', 'contacted', 'proposal_sent', 'negotiating', 'closed_won', 'closed_lost']
const STATUS_LABELS = {
  new: 'New', contacted: 'Contacted', proposal_sent: 'Proposal Sent',
  negotiating: 'Negotiating', closed_won: 'Won', closed_lost: 'Lost',
}
const STATUS_COLORS = {
  new: 'var(--blue)', contacted: 'var(--gold)', proposal_sent: 'var(--purple)',
  negotiating: 'var(--orange)', closed_won: 'var(--green)', closed_lost: 'var(--red)',
}

const NICHES = ['Telegram channels', 'small business', 'education', 'bloggers', 'e-commerce', 'services']
const LOCATIONS = ['Russia', 'Ukraine', 'Kazakhstan', 'Belarus', 'Worldwide', 'CIS']
const SERVICES = ['AI Telegram Bot', 'AI Content System', 'Landing Page + AI', 'Business Automation', 'AUREON Mini HQ']

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '8px 12px',
  color: 'var(--text-primary)',
  fontSize: '12px',
  outline: 'none',
  width: '100%',
}

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  background: 'var(--bg-elevated)',
  color: 'var(--text-secondary)',
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [pipeline, setPipeline] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showFinder, setShowFinder] = useState(false)
  const [finderResult, setFinderResult] = useState(null)
  const [finderLoading, setFinderLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState({})
  const [expandedLead, setExpandedLead] = useState(null)

  const [form, setForm] = useState({
    name: '', company: '', contact: '', platform: 'Telegram',
    niche: '', problem: '', aureon_offer: '', estimated_price: '',
    source_url: '', notes: '', status: 'new',
  })
  const [finderForm, setFinderForm] = useState({
    niche: 'Telegram channels', location: 'Russia',
    service: 'AI Telegram Bot', max_results: 10,
  })

  const load = useCallback(async () => {
    try {
      const [l, p] = await Promise.all([getLeads(), getPipelineStats()])
      setLeads(l)
      setPipeline(p)
    } catch {
      setLeads([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  const showMsg = (id, text, ok = true) => {
    setActionMsg(m => ({ ...m, [id]: { text, ok } }))
    setTimeout(() => setActionMsg(m => { const n = { ...m }; delete n[id]; return n }), 5000)
  }

  const handleStatus = async (lead, status) => {
    try {
      const fns = {
        contacted: markLeadContacted,
        proposal_sent: markLeadProposalSent,
        closed_won: markLeadWon,
        closed_lost: markLeadLost,
      }
      const fn = fns[status]
      if (fn) await fn(lead.id)
      else await updateLeadStatus(lead.id, status)
      load()
    } catch { }
  }

  const handleOutreach = async (lead) => {
    try {
      const r = await generateOutreach(lead.id)
      showMsg(lead.id, 'Outreach-сообщение готово — скопируйте из карточки')
      setExpandedLead({ ...lead, last_message: r.message })
      load()
    } catch {
      showMsg(lead.id, 'Ошибка генерации outreach', false)
    }
  }

  const handleGenerateOffer = async (lead) => {
    try {
      await generateOfferForLead(lead.id)
      showMsg(lead.id, 'КП создано — проверьте в разделе Offers')
      load()
    } catch {
      showMsg(lead.id, 'Ошибка генерации КП', false)
    }
  }

  const submitLead = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      await createLead({ ...form, estimated_price: parseFloat(form.estimated_price) || 0, is_demo: 0 })
    } catch { }
    setShowForm(false)
    setForm({ name: '', company: '', contact: '', platform: 'Telegram', niche: '', problem: '', aureon_offer: '', estimated_price: '', source_url: '', notes: '', status: 'new' })
    load()
  }

  const runFinder = async (e) => {
    e.preventDefault()
    setFinderLoading(true)
    try {
      const r = await findRealLeads({ ...finderForm, max_results: parseInt(finderForm.max_results) })
      setFinderResult(r)
    } catch {
      setFinderResult({ error: 'Backend недоступен' })
    }
    setFinderLoading(false)
  }

  return (
    <div style={{ maxWidth: 1100, animation: 'fadeIn 0.3s ease' }}>

      {/* Revenue Pipeline */}
      {pipeline && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02))',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
            Revenue Pipeline
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '10px' }}>
            {[
              { label: 'Total Potential', value: `$${(pipeline.total_potential_revenue || 0).toLocaleString()}`, color: 'var(--gold)' },
              { label: 'Won Revenue', value: `$${(pipeline.won_revenue || 0).toLocaleString()}`, color: 'var(--green)' },
              { label: 'Contacted', value: pipeline.contacted ?? 0, color: 'var(--blue)' },
              { label: 'Proposals Sent', value: pipeline.proposals_sent ?? 0, color: 'var(--purple)' },
              { label: 'Won Deals', value: pipeline.won_deals ?? 0, color: 'var(--green)' },
              { label: 'Conversion', value: `${pipeline.conversion_rate ?? 0}%`, color: pipeline.conversion_rate > 20 ? 'var(--green)' : 'var(--gold)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>{label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color, fontFamily: 'Space Grotesk' }}>{value}</div>
              </div>
            ))}
          </div>
          {pipeline.next_best_action && (
            <div style={{
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '11px',
              color: 'var(--gold)',
            }}>
              Next best action: {pipeline.next_best_action}
            </div>
          )}
        </div>
      )}

      {/* Stats + actions bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { label: 'Total', value: leads.length, color: 'var(--text-primary)' },
          { label: 'Real Leads', value: pipeline?.real_leads ?? 0, color: 'var(--green)' },
          { label: 'Pipeline', value: `$${leads.filter(l => !['closed_won','closed_lost'].includes(l.status)).reduce((s, l) => s + (l.estimated_price || 0), 0).toLocaleString()}`, color: 'var(--gold)' },
          { label: 'Won', value: leads.filter(l => l.status === 'closed_won').length, color: 'var(--green)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color, fontFamily: 'Space Grotesk' }}>{value}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => { setShowFinder(!showFinder); setShowForm(false) }}>
            Find Real Leads
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setShowFinder(false) }}>
            + Add Lead
          </Button>
        </div>
      </div>

      {/* Lead Finder */}
      {showFinder && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: '14px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', marginBottom: '12px', fontFamily: 'Space Grotesk' }}>
            Find Real Leads — Search Query Generator
          </div>
          <form onSubmit={runFinder}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Niche</div>
                <select value={finderForm.niche} onChange={e => setFinderForm(f => ({ ...f, niche: e.target.value }))} style={selectStyle}>
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Location</div>
                <select value={finderForm.location} onChange={e => setFinderForm(f => ({ ...f, location: e.target.value }))} style={selectStyle}>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Service to offer</div>
                <select value={finderForm.service} onChange={e => setFinderForm(f => ({ ...f, service: e.target.value }))} style={selectStyle}>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Max queries</div>
                <input type="number" value={finderForm.max_results} onChange={e => setFinderForm(f => ({ ...f, max_results: e.target.value }))} style={{ ...inputStyle, width: '60px' }} min={3} max={20} />
              </div>
            </div>
            <Button variant="primary" size="sm" disabled={finderLoading}>
              {finderLoading ? '⟳ Generating...' : 'Generate Search Queries'}
            </Button>
          </form>

          {finderResult && !finderResult.error && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Поисковые запросы для ниши «{finderResult.niche}» / {finderResult.location}:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
                {finderResult.search_queries?.map((q, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: '5px',
                    padding: '7px 10px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    fontFamily: 'monospace',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span>{q}</span>
                    <button onClick={() => navigator.clipboard?.writeText(q)} style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      cursor: 'pointer', fontSize: '10px', padding: '2px 5px',
                    }}>copy</button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                {finderResult.instructions?.map((ins, i) => <div key={i}>{ins}</div>)}
              </div>
              <div style={{
                marginTop: '8px', fontSize: '10px', color: 'var(--gold)',
                background: 'rgba(212,175,55,0.06)', border: '1px solid var(--border-gold)',
                borderRadius: '5px', padding: '6px 10px',
              }}>
                {finderResult.note}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Lead Form */}
      {showForm && (
        <form onSubmit={submitLead} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: '14px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', marginBottom: '12px' }}>Add Real Lead</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            {[
              { key: 'name', placeholder: 'Name / Channel *' },
              { key: 'company', placeholder: 'Company' },
              { key: 'contact', placeholder: 'Contact (username, phone...)' },
              { key: 'source_url', placeholder: 'Source URL (t.me/..., site...)' },
              { key: 'niche', placeholder: 'Niche (education, e-commerce...)' },
              { key: 'estimated_price', placeholder: 'Estimated price ($)' },
            ].map(({ key, placeholder }) => (
              <input key={key} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder} style={inputStyle} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Platform</div>
              <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} style={selectStyle}>
                {['Telegram', 'Instagram', 'VK', 'LinkedIn', 'Website', 'Other'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</div>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          {[
            { key: 'problem', placeholder: 'Problem / pain point...' },
            { key: 'aureon_offer', placeholder: 'AUREON offer for this lead...' },
            { key: 'notes', placeholder: 'Notes...' },
          ].map(({ key, placeholder }) => (
            <textarea key={key} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder} rows={2} style={{ ...inputStyle, resize: 'none', marginBottom: '8px', display: 'block' }} />
          ))}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowForm(false)} size="sm">Cancel</Button>
            <Button variant="primary" size="sm">Add Real Lead</Button>
          </div>
        </form>
      )}

      {/* Empty state when no real leads */}
      {leads.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>◎</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>No real leads yet</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', maxWidth: 400, margin: '0 auto 16px' }}>
            Use «Find Real Leads» to get search queries, or «+ Add Lead» to manually add a real prospect.
            Demo data has been removed.
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowFinder(true)}>Find Real Leads</Button>
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>+ Add Lead</Button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {leads.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {['all', ...STATUS_OPTIONS].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '4px 10px', borderRadius: '6px',
              border: filter === s ? '1px solid var(--border-gold)' : '1px solid var(--border)',
              background: filter === s ? 'var(--gold-dim)' : 'transparent',
              color: filter === s ? 'var(--gold)' : 'var(--text-muted)',
              fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
              {' '}({s === 'all' ? leads.length : leads.filter(l => l.status === s).length})
            </button>
          ))}
        </div>
      )}

      {/* Leads grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(lead => (
          <LeadRow
            key={lead.id}
            lead={lead}
            expanded={expandedLead?.id === lead.id ? expandedLead : null}
            onExpand={() => setExpandedLead(expandedLead?.id === lead.id ? null : lead)}
            onStatus={handleStatus}
            onOutreach={handleOutreach}
            onOffer={handleGenerateOffer}
            msg={actionMsg[lead.id]}
          />
        ))}
      </div>
    </div>
  )
}

function LeadRow({ lead, expanded, onExpand, onStatus, onOutreach, onOffer, msg }) {
  const st = lead.status
  const color = STATUS_COLORS[st] || 'var(--text-muted)'

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${expanded ? 'rgba(212,175,55,0.25)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}
        onClick={onExpand}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.name}</span>
            {lead.company && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· {lead.company}</span>}
            {lead.platform && <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>{lead.platform}</span>}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {lead.niche && <span>{lead.niche}</span>}
            {lead.estimated_price > 0 && <span style={{ color: 'var(--gold)', marginLeft: '8px', fontWeight: 600 }}>${lead.estimated_price?.toLocaleString()}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {lead.score > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 700, color: lead.score >= 80 ? 'var(--green)' : 'var(--gold)' }}>
              {lead.score}
            </span>
          )}
          <span style={{
            fontSize: '10px', fontWeight: 500, padding: '3px 8px', borderRadius: '12px',
            color, background: `${color}18`, border: `1px solid ${color}30`,
          }}>
            {STATUS_LABELS[st] || st}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', animation: 'fadeIn 0.15s ease' }}>
          {lead.problem && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>Problem</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{lead.problem}</div>
            </div>
          )}
          {lead.aureon_offer && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>AUREON Offer</div>
              <div style={{ fontSize: '12px', color: 'var(--gold)' }}>{lead.aureon_offer}</div>
            </div>
          )}
          {lead.contact && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>Contact</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{lead.contact}</div>
            </div>
          )}
          {lead.source_url && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>Source</div>
              <div style={{ fontSize: '11px', color: 'var(--blue)', wordBreak: 'break-all' }}>{lead.source_url}</div>
            </div>
          )}

          {/* Outreach message */}
          {(expanded.last_message || lead.last_message) && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                Generated Outreach Message
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '10px', fontSize: '11px',
                color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6,
                maxHeight: '200px', overflowY: 'auto',
              }}>
                {expanded.last_message || lead.last_message}
              </div>
              <button onClick={() => navigator.clipboard?.writeText(expanded.last_message || lead.last_message)}
                style={{ marginTop: '5px', background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px 8px', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer' }}>
                Copy to clipboard
              </button>
            </div>
          )}

          {msg && (
            <div style={{
              fontSize: '11px', color: msg.ok ? 'var(--green)' : 'var(--red)',
              background: msg.ok ? 'var(--green-dim)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${msg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
              borderRadius: '5px', padding: '6px 10px', marginBottom: '10px',
            }}>
              {msg.ok ? '✓ ' : '✗ '}{msg.text}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => onOutreach(lead)} style={actionBtn('#3B82F6')}>
              Generate Outreach
            </button>
            <button onClick={() => onOffer(lead)} style={actionBtn('#8B5CF6')}>
              Generate Offer
            </button>
            <div style={{ height: '1px', width: '1px', flex: 1 }} />
            {['contacted', 'proposal_sent', 'negotiating', 'closed_won', 'closed_lost'].map(s => (
              <button key={s} onClick={() => onStatus(lead, s)} style={{
                ...actionBtn(STATUS_COLORS[s]),
                opacity: lead.status === s ? 0.5 : 1,
                cursor: lead.status === s ? 'default' : 'pointer',
              }}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function actionBtn(color) {
  return {
    background: `${color}10`,
    border: `1px solid ${color}30`,
    color,
    padding: '5px 10px',
    borderRadius: '5px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontWeight: 500,
  }
}
