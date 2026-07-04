import React, { useEffect, useState, useCallback } from 'react'
import { getBotStatus, getBotUsers, getBotActions, startBot, stopBot, setWebhook, testTelegram, publishLatestToTelegram, syncTelegramUpdates, syncSalesChatIds } from '../api/client.js'

const API = import.meta.env.VITE_API_URL || ''
async function apiFetch(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const r = await fetch(`${API}${path}`, opts)
  if (!r.ok) { const d = await r.json().catch(() => null); throw new Error((typeof d?.detail === 'string' ? d.detail : null) || `HTTP ${r.status}`) }
  return r.json()
}

function fmt(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) }
  catch { return iso }
}

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '20px',
  marginBottom: '14px',
}

const btnStyle = (variant = 'default') => ({
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: variant === 'gold' ? '1px solid var(--border-gold)' : variant === 'green' ? '1px solid rgba(16,185,129,0.4)' : variant === 'red' ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border)',
  background: variant === 'gold' ? 'var(--gold-dim)' : variant === 'green' ? 'var(--green-dim)' : variant === 'red' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
  color: variant === 'gold' ? 'var(--gold)' : variant === 'green' ? 'var(--green)' : variant === 'red' ? 'var(--red)' : 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})

const label = {
  fontSize: '10px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: '4px',
  display: 'block',
}

const STATUS_COLOR = { success: 'var(--green)', error: 'var(--red)', warning: 'var(--gold)' }

export default function TelegramBot() {
  const [status, setStatus] = useState(null)
  const [users, setUsers] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [offline, setOffline] = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, u, a] = await Promise.all([getBotStatus(), getBotUsers(), getBotActions(30)])
      setStatus(s)
      setUsers(u)
      setActions(a)
      setOffline(false)
    } catch {
      setOffline(true)
    }
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 12000)
    return () => clearInterval(iv)
  }, [load])

  const flash = (ok, text) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 5000)
  }

  const handleStartBot = async () => {
    setLoading(true)
    try {
      const r = await startBot()
      flash(r.ok, r.message)
      await load()
    } catch (e) {
      flash(false, e?.response?.data?.detail || 'Ошибка запуска')
    }
    setLoading(false)
  }

  const handleStopBot = async () => {
    setLoading(true)
    try {
      const r = await stopBot()
      flash(r.ok, r.message)
      await load()
    } catch (e) {
      flash(false, 'Ошибка остановки')
    }
    setLoading(false)
  }

  const handleTestBot = async () => {
    setLoading(true)
    try {
      const r = await testTelegram()
      flash(true, `Бот подключён: @${r.username} (${r.name})`)
    } catch (e) {
      flash(false, e?.response?.data?.detail || 'Ошибка подключения')
    }
    setLoading(false)
  }

  const handlePublishLatest = async () => {
    setLoading(true)
    try {
      const r = await publishLatestToTelegram()
      flash(true, `Опубликован: ${r.title}`)
      await load()
    } catch (e) {
      flash(false, e?.response?.data?.detail || 'Ошибка публикации')
    }
    setLoading(false)
  }

  const handleSyncUpdates = async () => {
    setLoading(true)
    try {
      const r = await syncTelegramUpdates()
      const linked = r.leads_linked > 0 ? ` · Лидов привязано: ${r.leads_linked}` : ''
      flash(true, `Синхронизировано: ${r.updates_checked} updates, новых пользователей: ${r.users_saved}${linked}`)
      await load()
    } catch (e) {
      flash(false, e?.response?.data?.detail || 'Ошибка синхронизации')
    }
    setLoading(false)
  }

  const handleSyncChatIds = async () => {
    setLoading(true)
    try {
      const r = await syncSalesChatIds()
      flash(true, `Chat ID синхронизировано: ${r.updated_count} лидов привязано, ${r.not_found_count} не найдено`)
    } catch (e) {
      flash(false, e?.response?.data?.detail || 'Ошибка синхронизации chat IDs')
    }
    setLoading(false)
  }

  const handleSetWebhook = async () => {
    if (!webhookUrl) return
    setLoading(true)
    try {
      const r = await setWebhook(webhookUrl)
      flash(true, `Webhook установлен: ${r.webhook_url}`)
    } catch (e) {
      flash(false, e?.response?.data?.detail || 'Ошибка webhook')
    }
    setLoading(false)
  }

  const isRunning = status?.running === true

  return (
    <div style={{ maxWidth: 900, animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', margin: 0 }}>
              Telegram Bot
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Второй интерфейс к CEO Agent · AI-представитель AUREON · Не выдаёт себя за Максима
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: isRunning ? 'var(--green-dim)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isRunning ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
            borderRadius: '20px', padding: '6px 14px',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isRunning ? 'var(--green)' : 'var(--text-muted)',
              boxShadow: isRunning ? '0 0 8px var(--green)' : 'none',
            }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: isRunning ? 'var(--green)' : 'var(--text-muted)', letterSpacing: '0.08em' }}>
              {status ? (isRunning ? `ACTIVE · ${status.mode?.toUpperCase() || 'POLLING'}` : 'STOPPED') : '...'}
            </span>
          </div>
        </div>
      </div>

      {offline && (
        <div style={{ ...card, background: 'rgba(212,175,55,0.06)', borderColor: 'var(--border-gold)', marginBottom: 14 }}>
          <span style={{ fontSize: '12px', color: 'var(--gold)' }}>Backend offline — данные недоступны</span>
        </div>
      )}

      {msg && (
        <div style={{
          ...card,
          background: msg.ok ? 'var(--green-dim)' : 'rgba(239,68,68,0.06)',
          borderColor: msg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)',
          marginBottom: 14,
          padding: '10px 16px',
        }}>
          <span style={{ fontSize: '13px', color: msg.ok ? 'var(--green)' : 'var(--red)' }}>
            {msg.ok ? '✓ ' : '✗ '}{msg.text}
          </span>
        </div>
      )}

      {/* Status + Controls */}
      <div style={{ ...card }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          Bot Status
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Token', value: status?.token_configured ? '✓ Настроен' : '✗ Не задан', color: status?.token_configured ? 'var(--green)' : 'var(--red)' },
            { label: 'Mode', value: status?.mode || '—', color: 'var(--gold)' },
            { label: 'Registered Users', value: status?.registered_users ?? '—', color: 'var(--text-primary)' },
            { label: 'Updates Processed', value: status?.updates_processed ?? '—', color: 'var(--text-primary)' },
            { label: 'Last Update', value: fmt(status?.last_update_at), color: 'var(--text-muted)', small: true },
            { label: 'Started At', value: fmt(status?.started_at), color: 'var(--text-muted)', small: true },
          ].map(({ label: l, value, color, small }) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: small ? '12px' : '16px', fontWeight: 700, color, fontFamily: 'Space Grotesk' }}>{value}</div>
            </div>
          ))}
        </div>

        {status?.error && (
          <div style={{ fontSize: '11px', color: 'var(--red)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 10px', marginBottom: 12 }}>
            ⚠ Last error: {status.error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btnStyle('green')} onClick={handleStartBot} disabled={loading || isRunning}>
            ▶ Start Polling
          </button>
          <button style={btnStyle('red')} onClick={handleStopBot} disabled={loading || !isRunning}>
            ⏸ Stop
          </button>
          <button style={btnStyle('gold')} onClick={handleTestBot} disabled={loading}>
            ⚡ Test Connection
          </button>
          <button style={btnStyle('default')} onClick={handlePublishLatest} disabled={loading}>
            📢 Publish Latest Post
          </button>
          <button style={btnStyle('gold')} onClick={handleSyncUpdates} disabled={loading}>
            🔄 Sync Telegram Users
          </button>
          <button style={btnStyle('default')} onClick={handleSyncChatIds} disabled={loading}>
            🔗 Sync Lead Chat IDs
          </button>
          <button style={btnStyle('default')} onClick={load} disabled={loading}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Bot Commands Reference */}
      <div style={{ ...card }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          Команды бота
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
          {[
            { cmd: '/start', desc: 'Регистрация, сохранение chat_id, главное меню' },
            { cmd: '/status', desc: 'Статус CEO Agent: прогресс, выручка, агенты' },
            { cmd: '/run', desc: 'Запустить CEO Cycle (планирование + задачи)' },
            { cmd: '/post', desc: 'Сгенерировать пост для Telegram-канала' },
            { cmd: '/publish', desc: 'Опубликовать последний ready пост в канал' },
            { cmd: '/leads', desc: 'Показать список лидов с chat_id статусом' },
            { cmd: '/sales', desc: 'Sales Pipeline: все этапы и выручка' },
            { cmd: '/next', desc: 'Следующее денежное действие' },
            { cmd: '/report', desc: 'Отчёт за день: прогресс + последние действия' },
            { cmd: '/help', desc: 'Список всех команд' },
          ].map(({ cmd, desc }) => (
            <div key={cmd} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'monospace', minWidth: 80 }}>{cmd}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{desc}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(212,175,55,0.05)', border: '1px solid var(--border-gold)', borderRadius: 8 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gold)', marginBottom: 4 }}>Inline-кнопки в боте:</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            ⚡ Run CEO Cycle · ✍️ Generate Post · 📢 Publish to Channel · 🔍 Show Leads · 💬 Generate Outreach · 📤 Auto Send · 📊 Sales Pipeline · 📈 Daily Report · 💡 Next Action
          </div>
        </div>
      </div>

      {/* Registered Users */}
      <div style={{ ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Зарегистрированные пользователи ({users.length})
          </div>
        </div>
        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
            Нет пользователей. Отправьте <code style={{ color: 'var(--gold)' }}>/start</code> боту в Telegram.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map(u => (
              <div key={u.id} style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 1fr 80px 80px 100px',
                gap: 12,
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                alignItems: 'center',
                fontSize: '12px',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>
                  {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {u.first_name} {u.last_name}
                  </div>
                  {u.username && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{u.username}</div>}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                  chat_id: <span style={{ color: 'var(--gold)' }}>{u.chat_id}</span>
                </div>
                <div style={{ fontSize: '11px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Команд</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{u.command_count}</div>
                </div>
                <div style={{ fontSize: '11px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Последняя</div>
                  <div style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>{u.last_command || '—'}</div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  <div>Был: {fmt(u.last_seen_at)}</div>
                  <div>Рег: {fmt(u.registered_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Log */}
      <div style={{ ...card }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          Лог команд бота
        </div>
        {actions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
            Нет действий. Отправьте команду боту в Telegram.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {actions.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 6, alignItems: 'flex-start' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[a.status] || 'var(--text-muted)', flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', fontFamily: 'monospace' }}>{a.action}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{fmt(a.created_at)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{a.result}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CEO Reports */}
      <CeoReportsCard flash={flash} setMsg={setMsg} />

      {/* Webhook Setup */}
      <div style={{ ...card }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Webhook Mode (Render / Production)
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
          Локально используйте <b style={{ color: 'var(--gold)' }}>Polling</b> (Start Polling выше).
          Для деплоя на Render/VPS установите HTTPS webhook URL вашего сервера:
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
            placeholder="https://your-app.onrender.com"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
          />
          <button style={btnStyle('gold')} onClick={handleSetWebhook} disabled={loading || !webhookUrl}>
            Set Webhook
          </button>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 8 }}>
          Будет установлен endpoint: <code>{webhookUrl || 'https://...'}/api/telegram/webhook</code>
        </div>
      </div>

      {/* Bot Commands Reference — updated with report commands */}
      {/* Setup Instructions */}
      <div style={{ ...card, background: 'rgba(212,175,55,0.04)', borderColor: 'var(--border-gold)' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Инструкция по запуску
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { step: '1', text: 'Убедитесь, что TELEGRAM_BOT_TOKEN задан в backend/.env' },
            { step: '2', text: 'Нажмите "Start Polling" или бот стартует автоматически при запуске backend' },
            { step: '3', text: 'Найдите бота в Telegram и отправьте /start — chat_id сохранится в базе' },
            { step: '4', text: 'После /start бот может писать вам первым (уведомления, отчёты)' },
            { step: '5', text: 'Для Sales: лиды с вашим chat_id получат outreach автоматически через Auto Sales Loop' },
            { step: '6', text: 'Для production (Render): установите TELEGRAM_BOT_MODE=webhook в .env и укажите HTTPS URL выше' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
                {step}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingTop: 2 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── CEO Reports Card ──────────────────────────────────────────────────────────

function CeoReportsCard({ setMsg }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    try { setStatus(await apiFetch('GET', '/api/telegram/report-status')) } catch { }
  }, [])

  useEffect(() => { load() }, [load])

  const flash = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000) }

  async function handleSendNow() {
    setLoading(true)
    try {
      const r = await apiFetch('POST', '/api/telegram/send-report')
      flash(r.ok, r.message)
      await load()
    } catch (e) { flash(false, e.message) } finally { setLoading(false) }
  }

  async function handleToggle(enabled) {
    setLoading(true)
    try {
      await apiFetch('POST', `/api/telegram/reports-toggle?enabled=${enabled}`)
      flash(true, enabled ? 'CEO Reports включены' : 'CEO Reports выключены')
      await load()
    } catch (e) { flash(false, e.message) } finally { setLoading(false) }
  }

  const enabled = status?.enabled ?? true

  return (
    <div style={{ ...card, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          CEO Reports
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: enabled ? 'var(--green)' : 'var(--text-muted)',
            padding: '3px 8px', borderRadius: 10,
            background: enabled ? 'var(--green-dim)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${enabled ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
          }}>
            {enabled ? '● ACTIVE' : '● PAUSED'}
          </span>
          <button style={btnStyle(enabled ? 'red' : 'green')} onClick={() => handleToggle(!enabled)} disabled={loading}>
            {enabled ? 'Reports Off' : 'Reports On'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Founder Chat ID', value: status?.founder_chat_id || '— не задан', color: status?.founder_chat_id ? 'var(--gold)' : 'var(--red)', small: true },
          { label: 'Reports Sent', value: status?.reports_sent ?? '—' },
          { label: 'Утренний', value: status?.morning_time || '09:00', color: 'var(--text-secondary)' },
          { label: 'Вечерний', value: status?.evening_time || '21:00', color: 'var(--text-secondary)' },
          { label: 'Последний отчёт', value: status?.last_report_at ? new Date(status.last_report_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—', color: 'var(--text-muted)', small: true },
        ].map(({ label: l, value, color, small }) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: small ? '12px' : '16px', fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'Space Grotesk', wordBreak: 'break-all' }}>{value}</div>
          </div>
        ))}
      </div>

      {status?.error && (
        <div style={{ fontSize: '11px', color: 'var(--red)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 10px', marginBottom: 12 }}>
          ⚠ {status.error}
        </div>
      )}

      {!status?.founder_chat_id && (
        <div style={{ fontSize: '11px', color: 'var(--gold)', background: 'rgba(212,175,55,0.06)', border: '1px solid var(--border-gold)', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
          💡 Чтобы получать отчёты: отправьте <b>/start</b> боту в Telegram — chat_id сохранится автоматически.
          Или задайте <code>FOUNDER_TELEGRAM_CHAT_ID</code> в backend/.env
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={btnStyle('gold')} onClick={handleSendNow} disabled={loading}>
          📊 Отправить отчёт сейчас
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Команды в боте: /report · /morning · /evening · /reports_on · /reports_off
        </span>
      </div>
    </div>
  )
}
