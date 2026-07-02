import React, { useEffect, useState } from 'react'
import { getSettings, updateSettings, testTelegram, getTelegramStatus, saveTelegramSettings } from '../api/client.js'
import { MOCK_SETTINGS } from '../api/mockData.js'
import Button from '../components/Button.jsx'

const AUTONOMY_LEVELS = [
  { value: 1, label: 'Safe Mode', desc: 'Agent only plans and drafts. No autonomous execution.', color: 'var(--green)' },
  { value: 2, label: 'Semi-Auto', desc: 'Agent executes low-risk tasks automatically, pauses on important ones.', color: 'var(--gold)' },
  { value: 3, label: 'Aggressive', desc: 'Agent operates autonomously within defined boundaries.', color: 'var(--red)' },
]

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({})
  const [tgTest, setTgTest] = useState(null)
  const [tgTesting, setTgTesting] = useState(false)
  const [tgConfigured, setTgConfigured] = useState(null)
  const [tgForm, setTgForm] = useState({ bot_token: '', channel_id: '' })
  const [tgSaving, setTgSaving] = useState(false)
  const [tgSaved, setTgSaved] = useState(null)

  useEffect(() => {
    getSettings()
      .then(s => { setSettings(s); setForm(s) })
      .catch(() => { setSettings(MOCK_SETTINGS); setForm(MOCK_SETTINGS) })
    getTelegramStatus()
      .then(d => setTgConfigured(d.configured))
      .catch(() => setTgConfigured(false))
  }, [])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSaveTelegram = async () => {
    setTgSaving(true)
    setTgSaved(null)
    try {
      const result = await saveTelegramSettings(tgForm.bot_token, tgForm.channel_id)
      setTgConfigured(result.configured)
      setTgSaved({ ok: true, msg: 'Сохранено в backend/.env' })
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Ошибка сохранения'
      setTgSaved({ ok: false, msg: detail })
    }
    setTgSaving(false)
    setTimeout(() => setTgSaved(null), 4000)
  }

  const handleTestTelegram = async () => {
    setTgTesting(true)
    setTgTest(null)
    try {
      const result = await testTelegram()
      setTgTest({ ok: true, msg: `Подключено: @${result.username} (${result.name})` })
      setTgConfigured(true)
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Ошибка подключения к Telegram'
      setTgTest({ ok: false, msg: detail })
    }
    setTgTesting(false)
    setTimeout(() => setTgTest(null), 6000)
  }

  const save = async () => {
    try { await updateSettings(form) } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!form.project_name) return (
    <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading settings...</div>
  )

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '9px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  const labelStyle = {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 500,
    marginBottom: '6px',
    display: 'block',
  }

  return (
    <div style={{ maxWidth: 680, animation: 'fadeIn 0.3s ease' }}>
      {/* Project settings */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '14px',
      }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', marginBottom: '16px' }}>
          Project Configuration
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Project Name</label>
            <input value={form.project_name || ''} onChange={e => set('project_name', e.target.value)} style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--border-gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Founder Name</label>
            <input value={form.founder_name || ''} onChange={e => set('founder_name', e.target.value)} style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--border-gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Main Goal</label>
            <textarea value={form.main_goal || ''} onChange={e => set('main_goal', e.target.value)} rows={2}
              style={{ ...inputStyle, resize: 'none' }}
              onFocus={e => e.target.style.borderColor = 'var(--border-gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Revenue Goal ($)</label>
            <input value={form.revenue_goal || ''} onChange={e => set('revenue_goal', parseFloat(e.target.value) || 0)} type="number" style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--border-gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Telegram Channel</label>
            <input value={form.telegram_channel || ''} onChange={e => set('telegram_channel', e.target.value)} style={inputStyle}
              placeholder="@username"
              onFocus={e => e.target.style.borderColor = 'var(--border-gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        </div>
      </div>

      {/* API settings */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '14px',
      }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', marginBottom: '16px' }}>
          API Configuration
        </h3>
        <div>
          <label style={labelStyle}>OpenAI API Key</label>
          <input
            value={form.openai_api_key || ''}
            onChange={e => set('openai_api_key', e.target.value)}
            type="password"
            placeholder="sk-... (leave empty to use mock generation)"
            style={{ ...inputStyle }}
            onFocus={e => e.target.style.borderColor = 'var(--border-gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            When provided, CEO Agent will use real GPT-4o for generation instead of mock data.
          </div>
        </div>
      </div>

      {/* Autonomy level */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '14px',
      }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', marginBottom: '6px' }}>
          Autonomy Level
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Controls how much the agent acts without human confirmation
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {AUTONOMY_LEVELS.map(({ value, label, desc, color }) => {
            const isSelected = form.autonomy_level === value
            return (
              <div key={value} onClick={() => set('autonomy_level', value)} style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: isSelected ? `1px solid ${color}40` : '1px solid var(--border)',
                background: isSelected ? `${color}0C` : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                transition: 'all 0.15s',
              }}>
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: `2px solid ${isSelected ? color : 'var(--text-muted)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                }}>
                  {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: isSelected ? color : 'var(--text-primary)', marginBottom: '2px' }}>
                    Level {value}: {label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Telegram integration */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '14px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
            Telegram Integration
          </h3>
          {tgConfigured !== null && (
            <span style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 600,
              color: tgConfigured ? 'var(--green)' : 'var(--text-muted)',
              background: tgConfigured ? 'var(--green-dim)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tgConfigured ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
            }}>
              {tgConfigured ? '● Configured' : '○ Not configured'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>Bot Token</label>
            <input
              value={tgForm.bot_token}
              onChange={e => setTgForm(f => ({ ...f, bot_token: e.target.value }))}
              type="password"
              placeholder="1234567890:AAF..."
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--border-gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Channel ID</label>
            <input
              value={tgForm.channel_id}
              onChange={e => setTgForm(f => ({ ...f, channel_id: e.target.value }))}
              placeholder="@username или -1001234567890"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--border-gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        </div>

        {tgSaved && (
          <div style={{
            fontSize: '12px',
            color: tgSaved.ok ? 'var(--green)' : 'var(--red)',
            background: tgSaved.ok ? 'var(--green-dim)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${tgSaved.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '12px',
            animation: 'fadeIn 0.2s ease',
          }}>
            {tgSaved.ok ? '✓ ' : '✗ '}{tgSaved.msg}
          </div>
        )}

        {tgTest && (
          <div style={{
            fontSize: '12px',
            color: tgTest.ok ? 'var(--green)' : 'var(--red)',
            background: tgTest.ok ? 'var(--green-dim)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${tgTest.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '12px',
            animation: 'fadeIn 0.2s ease',
          }}>
            {tgTest.ok ? '✓ ' : '✗ '}{tgTest.msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="primary" onClick={handleSaveTelegram} disabled={tgSaving} size="sm">
            {tgSaving ? '⟳ Сохраняю...' : 'Save Telegram Settings'}
          </Button>
          <Button variant="secondary" onClick={handleTestTelegram} disabled={tgTesting} size="sm">
            {tgTesting ? '⟳ Проверяю...' : '⚡ Test Connection'}
          </Button>
        </div>
      </div>

      {/* Danger zone notice */}
      <div style={{
        background: 'rgba(239,68,68,0.04)',
        border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        marginBottom: '16px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: '6px' }}>Agent Boundaries</div>
        The agent will NEVER: send real messages to clients, make payments, sign legal documents, or impersonate a human.
        All client-facing content is marked as AI-generated and requires manual review before sending.
      </div>

      {/* Save */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        {saved && (
          <span style={{ color: 'var(--green)', fontSize: '12px', alignSelf: 'center', animation: 'fadeIn 0.2s ease' }}>
            ✓ Settings saved
          </span>
        )}
        <Button variant="primary" onClick={save}>Save Settings</Button>
      </div>
    </div>
  )
}
