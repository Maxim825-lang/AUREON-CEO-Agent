import React, { useEffect, useState } from 'react'
import { getSettings, updateSettings, testTelegram, getTelegramStatus, saveTelegramSettings, clearDemoData, getDemoDataCount, getTelegramUpdates, importTelegramChatId } from '../api/client.js'
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
  const [demoCount, setDemoCount] = useState(null)
  const [clearingDemo, setClearingDemo] = useState(false)
  const [clearMsg, setClearMsg] = useState(null)
  const [tgUpdates, setTgUpdates] = useState(null)
  const [tgUpdatesLoading, setTgUpdatesLoading] = useState(false)
  const [tgUpdatesErr, setTgUpdatesErr] = useState(null)
  const [importingChatId, setImportingChatId] = useState({})
  const [importMsg, setImportMsg] = useState({})

  useEffect(() => {
    getSettings()
      .then(s => { setSettings(s); setForm(s) })
      .catch(() => {})
    getTelegramStatus()
      .then(d => setTgConfigured(d.configured))
      .catch(() => setTgConfigured(false))
    getDemoDataCount()
      .then(setDemoCount)
      .catch(() => {})
  }, [])

  const handleClearDemo = async () => {
    if (!window.confirm('Удалить все demo/mock данн��е?\n\nБудут удалены:\n• Лиды с именами SkillUp School, LaunchPad Startup, MindGrow Blogger, LocalStyle Brand, Telegram Business Channel\n• Все записи с is_demo=true\n• Фейковые action logs и�� seed-данных\n\nНастройки и реальные данные не затронуты.')) return
    setClearingDemo(true)
    try {
      const r = await clearDemoData()
      setClearMsg({ ok: true, msg: r.message })
      getDemoDataCount().then(setDemoCount).catch(() => {})
    } catch {
      setClearMsg({ ok: false, msg: 'Ошибка очистки — backend недоступен?' })
    }
    setClearingDemo(false)
    setTimeout(() => setClearMsg(null), 5000)
  }

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

  const handleGetUpdates = async () => {
    setTgUpdatesLoading(true)
    setTgUpdatesErr(null)
    try {
      const data = await getTelegramUpdates()
      setTgUpdates(data)
    } catch (err) {
      setTgUpdatesErr(err?.response?.data?.detail || 'Ошибка получения обновлений')
    }
    setTgUpdatesLoading(false)
  }

  const handleImportChatId = async (update) => {
    const key = update.update_id
    setImportingChatId(p => ({ ...p, [key]: true }))
    try {
      const result = await importTelegramChatId({
        chat_id: update.chat_id,
        username: update.username,
        first_name: update.first_name,
        last_name: update.last_name,
      })
      setImportMsg(p => ({
        ...p,
        [key]: { ok: true, msg: result.status === 'created' ? `Создан лид: ${result.name}` : `Обновлён лид #${result.lead_id}: ${result.name}` },
      }))
    } catch (err) {
      setImportMsg(p => ({
        ...p,
        [key]: { ok: false, msg: err?.response?.data?.detail || 'Ошибка импорта' },
      }))
    }
    setImportingChatId(p => ({ ...p, [key]: false }))
    setTimeout(() => setImportMsg(p => { const n = { ...p }; delete n[key]; return n }), 5000)
  }

  const save = async () => {
    try { await updateSettings(form) } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!form.project_name) return (
    <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>
      <div style={{ marginBottom: '8px' }}>Loading settings...</div>
      <div style={{ fontSize: '11px' }}>Backend недоступен — настройки недоступны без сервера.</div>
    </div>
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
            placeholder="sk-... (leave empty to use template generation)"
            style={{ ...inputStyle }}
            onFocus={e => e.target.style.borderColor = 'var(--border-gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            When provided, CEO Agent will use real GPT-4o. Without it, content is generated via templates (no AI).
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

      {/* Telegram Debug Tools */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '14px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', marginBottom: '3px' }}>
              Telegram Debug Tools
            </h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Получи chat_id пользователей, написавших боту, и сохрани их в базу
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleGetUpdates} disabled={tgUpdatesLoading}>
            {tgUpdatesLoading ? '⟳ Загружаю...' : '⟳ Get Updates'}
          </Button>
        </div>

        {tgUpdatesErr && (
          <div style={{
            fontSize: '12px', color: 'var(--red)',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '6px', padding: '8px 12px', marginBottom: '12px',
          }}>
            ✗ {tgUpdatesErr}
          </div>
        )}

        {tgUpdates && tgUpdates.count === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px', textAlign: 'center' }}>
            Нет обновлений. Напишите боту в Telegram, потом нажмите Get Updates.
          </div>
        )}

        {tgUpdates && tgUpdates.updates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tgUpdates.updates.map(u => (
              <div key={u.update_id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '10px',
                alignItems: 'start',
              }}>
                <div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {u.first_name || '—'}{u.last_name ? ' ' + u.last_name : ''}
                    </span>
                    {u.username && (
                      <span style={{ fontSize: '11px', color: 'var(--gold)' }}>@{u.username}</span>
                    )}
                    <span style={{
                      fontSize: '10px', color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px',
                    }}>
                      chat_id: {u.chat_id}
                    </span>
                  </div>
                  {u.message && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      "{u.message.length > 80 ? u.message.slice(0, 80) + '...' : u.message}"
                    </div>
                  )}
                  {importMsg[u.update_id] && (
                    <div style={{
                      fontSize: '11px', marginTop: '5px',
                      color: importMsg[u.update_id].ok ? 'var(--green)' : 'var(--red)',
                    }}>
                      {importMsg[u.update_id].ok ? '✓ ' : '✗ '}{importMsg[u.update_id].msg}
                    </div>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleImportChatId(u)}
                  disabled={importingChatId[u.update_id]}
                >
                  {importingChatId[u.update_id] ? '⟳' : 'Import chat_id'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear Demo Data */}
      <div style={{
        background: 'rgba(239,68,68,0.04)',
        border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        marginBottom: '14px',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--red)', fontFamily: 'Space Grotesk', marginBottom: '6px' }}>
          Demo Data Management
        </div>
        {demoCount && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.6 }}>
            Demo лиды: <span style={{ color: demoCount.demo_leads > 0 ? 'var(--gold)' : 'var(--green)' }}>{demoCount.demo_leads}</span>
            {' · '}Demo офферы: <span style={{ color: demoCount.demo_offers > 0 ? 'var(--gold)' : 'var(--green)' }}>{demoCount.demo_offers}</span>
            {' · '}Demo посты: <span style={{ color: demoCount.demo_posts > 0 ? 'var(--gold)' : 'var(--green)' }}>{demoCount.demo_posts}</span>
            {' · '}Реальные лиды: <span style={{ color: 'var(--green)', fontWeight: 600 }}>{demoCount.real_leads}</span>
          </div>
        )}
        {clearMsg && (
          <div style={{
            fontSize: '11px',
            color: clearMsg.ok ? 'var(--green)' : 'var(--red)',
            background: clearMsg.ok ? 'var(--green-dim)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${clearMsg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: '5px', padding: '7px 10px', marginBottom: '10px',
          }}>
            {clearMsg.ok ? '✓ ' : '✗ '}{clearMsg.msg}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="danger" size="sm" onClick={handleClearDemo} disabled={clearingDemo}>
            {clearingDemo ? '⟳ Clearing...' : 'Clear Demo Data'}
          </Button>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Удалит demo-лиды, офферы и посты. Настройки Telegram, automation и action logs — не затрагиваются.
          </span>
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
