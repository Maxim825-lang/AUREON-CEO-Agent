import React, { useEffect, useState } from 'react'
import { getOffers, generateOffer } from '../api/client.js'
import { MOCK_OFFERS } from '../api/mockData.js'
import OfferCard from '../components/OfferCard.jsx'
import Button from '../components/Button.jsx'

const SERVICES = ['AI Telegram Bot', 'AI Content System', 'Landing Page + AI', 'Business Automation', 'AI Assistant for Project']

export default function Offers() {
  const [offers, setOffers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client: '', service: 'AI Telegram Bot', price: '' })
  const [generating, setGenerating] = useState(false)

  const load = () => getOffers().then(setOffers).catch(() => setOffers(MOCK_OFFERS))
  useEffect(() => { load() }, [])

  const generate = async (e) => {
    e.preventDefault()
    if (!form.client.trim()) return
    setGenerating(true)
    try {
      await generateOffer({ client: form.client, service: form.service, price: parseFloat(form.price) || undefined })
    } catch {}
    setGenerating(false)
    setShowForm(false)
    setForm({ client: '', service: 'AI Telegram Bot', price: '' })
    load()
  }

  const totalValue = offers.reduce((s, o) => s + (o.price || 0), 0)
  const sent = offers.filter(o => o.status === 'sent').length
  const accepted = offers.filter(o => o.status === 'accepted').length

  return (
    <div style={{ maxWidth: 900, animation: 'fadeIn 0.3s ease' }}>
      {/* Header stats */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        marginBottom: '16px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { label: 'Total Offers', value: offers.length },
            { label: 'Pipeline', value: `$${totalValue.toLocaleString()}`, color: 'var(--gold)' },
            { label: 'Sent', value: sent, color: 'var(--blue)' },
            { label: 'Accepted', value: accepted, color: 'var(--green)' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Button variant="primary" onClick={() => setShowForm(!showForm)} size="sm">
            ✨ Generate Offer
          </Button>
        </div>
      </div>

      {/* Generate form */}
      {showForm && (
        <form onSubmit={generate} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: '16px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            AI will generate a full commercial proposal
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <input
              value={form.client}
              onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
              placeholder="Client name *"
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                minWidth: 160,
              }}
            />
            <select value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '8px 10px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
            }}>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="Price ($ optional)"
              type="number"
              style={{
                width: 140,
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
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowForm(false)} size="sm">Cancel</Button>
            <Button variant="primary" size="sm" disabled={generating}>
              {generating ? '⟳ Generating...' : 'Generate'}
            </Button>
          </div>
        </form>
      )}

      {/* Offers list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {offers.map(offer => (
          <OfferCard key={offer.id} offer={offer} onUpdate={load} />
        ))}
        {offers.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px', fontSize: '13px' }}>
            No offers yet. Generate your first commercial proposal.
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: '20px',
        padding: '12px 14px',
        background: 'rgba(212,175,55,0.04)',
        border: '1px solid var(--border-gold)',
        borderRadius: 'var(--radius-md)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
      }}>
        ⚠ All offers are generated by AI-representative of AUREON. Final approval and sending requires human confirmation.
        The agent operates in <strong style={{ color: 'var(--gold)' }}>SAFE MODE</strong> — no real messages are sent automatically.
      </div>
    </div>
  )
}
