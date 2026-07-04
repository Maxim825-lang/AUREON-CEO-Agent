import React, { useEffect, useState, useCallback } from 'react'
import Button from '../components/Button.jsx'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function apiGet(path) {
  const r = await fetch(`${API_BASE}${path}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}
async function apiPost(path) {
  const r = await fetch(`${API_BASE}${path}`, { method: 'POST' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

function fmt(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

const STATUS_COLORS = {
  success: 'var(--green)',
  error: 'var(--red)',
  warning: 'var(--gold)',
}

export default function Automation() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [runMsg, setRunMsg] = useState(null)
  const [offline, setOffline] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await apiGet('/api/automation/status')
      setData(d)
      setOffline(false)
    } catch {
      setOffline(true)
    }
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 15000)
    return () => clearInterval(iv)
  }, [load])

  const handleStart = async () => {
    setLoading(true)
    try {
      const d = await apiPost('/api/automation/start')
      setData(d)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      const d = await apiPost('/api/automation/stop')
      setData(d)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleRunNow = async () => {
    setLoading(true)
    setRunMsg(null)
    try {
      const d = await apiPost('/api/automation/run-now')
      setData(d)
      setRunMsg({ ok: true, text: 'CEO-цикл запущен' })
    } catch (e) {
      setRunMsg({ ok: false, text: 'Ошибка запуска' })
    }
    setLoading(false)
    setTimeout(() => setRunMsg(null), 4000)
  }

  const isActive = data?.enabled === true

  return (
    <div style={{ maxWidth: 900, animation: 'fadeIn 0.3s ease' }}>
      {offline && (
        <div style={{
          background: 'var(--gold-dim)',
          border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 14px',
          fontSize: '11px',
          color: 'var(--gold)',
          marginBottom: '16px',
        }}>
          Backend offline — данные недоступны
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', margin: 0 }}>
              Automation
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Автономный режим 24/7 — CEO Agent работает без участия человека
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isActive ? 'var(--green-dim)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isActive ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
            borderRadius: '20px',
            padding: '6px 14px',
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isActive ? 'var(--green)' : 'var(--text-muted)',
              display: 'inline-block',
              boxShadow: isActive ? '0 0 8px var(--green)' : 'none',
            }} />
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: isActive ? 'var(--green)' : 'var(--text-muted)',
              letterSpacing: '0.08em',
              fontFamily: 'Space Grotesk',
            }}>
              {data ? (isActive ? 'ACTIVE' : 'PAUSED') : '...'}
            </span>
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      }}>
        <Button
          variant="success"
          size="md"
          onClick={handleStart}
          disabled={loading || isActive || offline}
        >
          ▶ Start
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={handleStop}
          disabled={loading || !isActive || offline}
        >
          ⏸ Stop
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleRunNow}
          disabled={loading || offline}
        >
          ⚡ Run Now
        </Button>
        <Button variant="secondary" size="md" onClick={load} disabled={loading}>
          ↻ Refresh
        </Button>
        {runMsg && (
          <span style={{
            fontSize: '12px',
            color: runMsg.ok ? 'var(--green)' : 'var(--red)',
            fontWeight: 600,
            marginLeft: 8,
          }}>
            {runMsg.text}
          </span>
        )}
      </div>

      {/* Real Sales Mode status panel */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        marginBottom: '20px',
      }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
          Sales System Status
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {[
            {
              label: 'Real Sales Mode',
              value: data?.real_sales_mode ? 'ON' : 'OFF',
              color: data?.real_sales_mode ? 'var(--green)' : 'var(--text-muted)',
              note: data?.real_sales_mode ? 'Реальные лиды в CRM' : 'Добавьте реальных лидов',
            },
            {
              label: 'Telegram Posting',
              value: data?.telegram_connected ? 'Connected' : 'Not connected',
              color: data?.telegram_connected ? 'var(--green)' : 'var(--gold)',
              note: data?.telegram_connected ? 'Канал настроен' : 'Настройте в Settings',
            },
            {
              label: 'Real Leads',
              value: data?.real_leads_count ?? '—',
              color: (data?.real_leads_count > 0) ? 'var(--green)' : 'var(--text-muted)',
              note: 'В разделе Leads',
            },
            {
              label: 'Demo Data',
              value: data?.demo_data_cleared ? 'Cleared' : 'Present',
              color: data?.demo_data_cleared ? 'var(--green)' : 'var(--gold)',
              note: data?.demo_data_cleared ? 'База чистая' : 'Очистите в Settings',
            },
          ].map(({ label, value, color, note }) => (
            <div key={label} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px' }}>{label}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color, fontFamily: 'Space Grotesk', marginBottom: '3px' }}>{value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{note}</div>
            </div>
          ))}
        </div>
        {data && !offline && (
          <div style={{
            marginTop: '12px',
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid var(--border-gold)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '11px',
            color: 'var(--gold)',
          }}>
            Next money action: {
              !data.telegram_connected ? 'Настройте Telegram в Settings для публикации' :
              !data.real_sales_mode ? 'Добавьте реальных лидов в CRM — раздел Leads' :
              data.enabled ? 'Automation активна — CEO цикл работает автоматически' :
              'Запустите Automation для автономной работы системы'
            }
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Циклов выполнено', value: data?.cycles_done ?? '—', color: 'var(--gold)' },
          { label: 'Постов опубликовано', value: data?.posts_published ?? '—', color: 'var(--green)' },
          { label: 'Последний цикл', value: fmt(data?.last_cycle_at), color: 'var(--text-primary)', small: true },
          { label: 'Следующий цикл', value: fmt(data?.next_cycle_at), color: 'var(--text-primary)', small: true },
        ].map(({ label, value, color, small }) => (
          <div key={label} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {label}
            </div>
            <div style={{ fontSize: small ? '13px' : '24px', fontWeight: 700, color, fontFamily: 'Space Grotesk' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Sales Auto Loop stats */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
          Sales Auto Loop
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {[
            {
              label: 'Сгенерировано сообщений',
              value: data?.sales_generated ?? '—',
              color: 'var(--gold)',
            },
            {
              label: 'Отправлено через Telegram',
              value: data?.sales_sent ?? '—',
              color: 'var(--green)',
            },
            {
              label: 'Требует ручной отправки',
              value: data?.sales_manual_required ?? '—',
              color: data?.sales_manual_required > 0 ? 'var(--gold)' : 'var(--text-muted)',
              note: 'Нет chat_id — напишите боту и импортируйте',
            },
            {
              label: 'Последний запуск',
              value: fmt(data?.last_sales_at),
              color: 'var(--text-primary)',
              small: true,
            },
          ].map(({ label, value, color, note, small }) => (
            <div key={label} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px' }}>{label}</div>
              <div style={{ fontSize: small ? '13px' : '20px', fontWeight: 700, color, fontFamily: 'Space Grotesk', marginBottom: note ? '3px' : 0 }}>{value}</div>
              {note && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{note}</div>}
            </div>
          ))}
        </div>
        {data && !offline && data.sales_manual_required > 0 && (
          <div style={{
            marginTop: '12px',
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid var(--border-gold)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '11px',
            color: 'var(--gold)',
          }}>
            {data.sales_manual_required} лида без chat_id — откройте Settings → Telegram Debug Tools → Get Updates → Import chat_id, затем повторите Auto Sales Loop.
          </div>
        )}
      </div>

      {/* Config panel */}
      {data?.config && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
            Конфигурация (.env)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { label: 'CEO цикл', value: `каждые ${data.config.cycle_interval_minutes} мин` },
              { label: 'Telegram пост', value: `каждые ${data.config.post_interval_hours} ч` },
              { label: 'Sales Auto Loop', value: `каждые ${data.config.sales_auto_interval_hours} ч` },
              { label: 'Утренний отчёт', value: data.config.morning_report },
              { label: 'Вечерний отчёт', value: data.config.evening_report },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
              }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 600, fontFamily: 'Space Grotesk' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action log */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
      }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          Журнал автоматизации
        </div>
        {!data?.action_log?.length ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            Нет записей. Запустите первый цикл.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.action_log.map((entry, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '12px',
                padding: '10px 14px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                alignItems: 'flex-start',
              }}>
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: STATUS_COLORS[entry.status] || 'var(--text-muted)',
                  flexShrink: 0,
                  marginTop: 4,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{entry.action}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{entry.time}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{entry.result}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
