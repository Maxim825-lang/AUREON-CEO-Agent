import React, { useEffect, useState, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || ''

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const r = await fetch(`${API}${path}`, opts)
  if (!r.ok) {
    const d = await r.json().catch(() => null)
    throw new Error((typeof d?.detail === 'string' ? d.detail : null) || `HTTP ${r.status}`)
  }
  return r.json()
}
const get = (path) => api('GET', path)
const post = (path, body) => api('POST', path, body)

// ── Styles ────────────────────────────────────────────────────────────────────

const card = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '16px',
}

const btn = (variant = 'default', disabled = false) => ({
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: variant === 'gold' ? '1px solid var(--border-gold)'
       : variant === 'purple' ? '1px solid rgba(139,92,246,0.4)'
       : variant === 'green' ? '1px solid rgba(16,185,129,0.4)'
       : '1px solid var(--border)',
  background: variant === 'gold' ? 'var(--gold-dim)'
            : variant === 'purple' ? 'rgba(139,92,246,0.1)'
            : variant === 'green' ? 'var(--green-dim)'
            : 'var(--bg-surface)',
  color: variant === 'gold' ? 'var(--gold)'
       : variant === 'purple' ? '#A78BFA'
       : variant === 'green' ? 'var(--green)'
       : 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  whiteSpace: 'nowrap',
})

const chipBase = (selected, color = '#D4AF37') => ({
  padding: '8px 14px',
  borderRadius: '20px',
  border: selected ? `1px solid ${color}` : '1px solid var(--border)',
  background: selected ? `${color}18` : 'var(--bg-surface)',
  color: selected ? color : 'var(--text-secondary)',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
  fontWeight: selected ? 600 : 400,
})

// ── Mood data ─────────────────────────────────────────────────────────────────

const MOODS = [
  { key: 'discipline',      label: 'Discipline',       emoji: '⚡', color: '#E5E5E5' },
  { key: 'lonely_founder',  label: 'Lonely Founder',   emoji: '🌙', color: '#6B9BD2' },
  { key: 'dark_motivation', label: 'Dark Motivation',  emoji: '🔥', color: '#FF3366' },
  { key: 'luxury_business', label: 'Luxury Business',  emoji: '💎', color: '#D4AF37' },
  { key: 'revenge_arc',     label: 'Revenge Arc',      emoji: '⚔️', color: '#CC0000' },
  { key: 'calm_focus',      label: 'Calm Focus',       emoji: '🧘', color: '#8DB6CD' },
  { key: 'future_scifi',    label: 'Future / Sci-Fi',  emoji: '🚀', color: '#7B2FBE' },
  { key: 'confidence',      label: 'Confidence',       emoji: '👑', color: '#FFD700' },
  { key: 'pressure',        label: 'Pressure',         emoji: '⏱', color: '#FF6B00' },
  { key: 'victory',         label: 'Victory',          emoji: '🏆', color: '#10B981' },
]

const CHARACTERS = [
  { key: 'founder',         label: 'Founder',     emoji: '🏗' },
  { key: 'ceo',             label: 'CEO',         emoji: '👔' },
  { key: 'strategist',      label: 'Strategist',  emoji: '♟' },
  { key: 'sigma',           label: 'Sigma',       emoji: '🐺' },
  { key: 'student_builder', label: 'Builder',     emoji: '🔨' },
  { key: 'athlete',         label: 'Athlete',     emoji: '🏋' },
  { key: 'creator',         label: 'Creator',     emoji: '🎨' },
  { key: 'investor',        label: 'Investor',    emoji: '📈' },
]

const GOALS = [
  { key: 'movie',    label: 'Выбрать фильм' },
  { key: 'clips',    label: 'Идеи для нарезки' },
  { key: 'quotes',   label: 'Подобрать цитаты' },
  { key: 'post',     label: 'Сделать пост' },
  { key: 'tiktok',   label: 'TikTok сценарий' },
  { key: 'visual',   label: 'Визуальный стиль' },
]

// ── Main page ────────────────────────────────────────────────────────────────

export default function Cinema() {
  const [mood, setMood] = useState('discipline')
  const [character, setCharacter] = useState('founder')
  const [goal, setGoal] = useState('post')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [flash, setFlash] = useState(null)
  const [tab, setTab] = useState('movies')
  const [history, setHistory] = useState([])

  const activeMood = MOODS.find(m => m.key === mood) || MOODS[0]

  const showFlash = (ok, text) => {
    setFlash({ ok, text })
    setTimeout(() => setFlash(null), 4000)
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const goalLabel = GOALS.find(g => g.key === goal)?.label || goal
      const res = await post('/api/cinema/recommend', {
        mood,
        character_type: character,
        goal: goalLabel,
        topic: 'AUREON',
      })
      setResult(res)
      setTab('movies')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveToMemory() {
    if (!result) return
    try {
      await post('/api/cinema/save-to-memory', { result, memory_type: 'knowledge' })
      showFlash(true, 'Сохранено в Memory Core')
      loadHistory()
    } catch (e) {
      showFlash(false, e.message)
    }
  }

  async function handleCreatePost() {
    if (!result?.telegram_post) return
    try {
      const res = await post('/api/cinema/create-post', {
        post_text: result.telegram_post,
        topic: 'cinema',
      })
      showFlash(true, `Пост создан: ID ${res.post_id} (статус: draft)`)
    } catch (e) {
      showFlash(false, e.message)
    }
  }

  const loadHistory = useCallback(async () => {
    try { setHistory(await get('/api/cinema/history?limit=10')) } catch { }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', display: 'flex', alignItems: 'center', gap: 8 }}>
            🎬 Cinema Agent
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            Фильмы · Сцены · Цитаты · Clip Ideas · Визуальный стиль под настроение контента
          </div>
        </div>
        {result && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={btn('green')} onClick={handleSaveToMemory}>◎ Сохранить в Memory</button>
            <button style={btn('gold')} onClick={handleCreatePost}>📢 Создать пост</button>
          </div>
        )}
      </div>

      {flash && (
        <div style={{
          ...card,
          background: flash.ok ? 'var(--green-dim)' : 'rgba(239,68,68,0.06)',
          borderColor: flash.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)',
          marginBottom: 12, padding: '10px 16px',
        }}>
          <span style={{ fontSize: 13, color: flash.ok ? 'var(--green)' : '#EF4444' }}>
            {flash.ok ? '✓ ' : '✗ '}{flash.text}
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: result ? '380px 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* Left: Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mood selector */}
          <div style={card}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              Mood
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {MOODS.map(m => (
                <button
                  key={m.key}
                  style={chipBase(mood === m.key, m.color)}
                  onClick={() => setMood(m.key)}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Character selector */}
          <div style={card}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              Character / Persona
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CHARACTERS.map(c => (
                <button
                  key={c.key}
                  style={chipBase(character === c.key, '#D4AF37')}
                  onClick={() => setCharacter(c.key)}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Goal selector */}
          <div style={card}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              Goal
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {GOALS.map(g => (
                <button
                  key={g.key}
                  style={chipBase(goal === g.key, '#8B5CF6')}
                  onClick={() => setGoal(g.key)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selected mood preview */}
          <div style={{
            ...card,
            background: `${activeMood.color}08`,
            borderColor: `${activeMood.color}30`,
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{activeMood.emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: activeMood.color, marginBottom: 4 }}>
              {activeMood.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {CHARACTERS.find(c => c.key === character)?.emoji} {CHARACTERS.find(c => c.key === character)?.label} ·{' '}
              {GOALS.find(g => g.key === goal)?.label}
            </div>
          </div>

          {/* Generate button */}
          <button
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${activeMood.color}50`,
              background: `${activeMood.color}15`,
              color: activeMood.color,
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'Space Grotesk',
              letterSpacing: '0.04em',
              transition: 'all 0.2s ease',
            }}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? '⏳ Генерирую…' : '🎬 Подобрать референсы'}
          </button>

          {error && (
            <div style={{ fontSize: 12, color: '#EF4444', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 6 }}>
              ✗ {error}
            </div>
          )}
        </div>

        {/* Right: Results */}
        {result && (
          <ResultsPanel
            result={result}
            activeMood={activeMood}
            tab={tab}
            setTab={setTab}
            onSaveToMemory={handleSaveToMemory}
            onCreatePost={handleCreatePost}
            onShowFlash={showFlash}
          />
        )}

        {/* Empty state — show history on the right */}
        {!result && history.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              История референсов
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(entry => (
                <div key={entry.id} style={{
                  ...card, padding: '10px 14px',
                  borderLeft: '3px solid #8B5CF6',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{entry.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{entry.summary}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!result && history.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
              <div style={{ fontSize: 14 }}>Выбери настроение и нажми «Подобрать референсы»</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Results Panel ─────────────────────────────────────────────────────────────

function ResultsPanel({ result, activeMood, tab, setTab, onSaveToMemory, onCreatePost, onShowFlash }) {
  const RESULT_TABS = [
    { key: 'movies',  label: '🎬 Фильмы' },
    { key: 'scenes',  label: '🎥 Сцены' },
    { key: 'quotes',  label: '💬 Цитаты' },
    { key: 'clips',   label: '✂️ Clip Ideas' },
    { key: 'post',    label: '📢 Пост' },
    { key: 'tiktok',  label: '📱 TikTok' },
  ]

  const palette = result.palette || {}
  const colors = palette.colors || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Palette strip */}
      <div style={{
        ...card,
        background: 'rgba(0,0,0,0.3)',
        borderColor: `${activeMood.color}30`,
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {colors.map((c, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: c, flexShrink: 0 }} title={c} />
          ))}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: activeMood.color }}>{palette.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{palette.feeling}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }} onClick={onSaveToMemory}>◎ Memory</button>
          <button style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-gold)', background: 'var(--gold-dim)', color: 'var(--gold)', fontSize: 11, cursor: 'pointer' }} onClick={onCreatePost}>📢 Post</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
        {RESULT_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 14px',
            background: 'none', border: 'none',
            borderBottom: tab === t.key ? `2px solid ${activeMood.color}` : '2px solid transparent',
            color: tab === t.key ? activeMood.color : 'var(--text-muted)',
            fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
            cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'movies'  && <MoviesTab movies={result.movies} activeMood={activeMood} />}
      {tab === 'scenes'  && <ScenesTab scenes={result.scenes} activeMood={activeMood} />}
      {tab === 'quotes'  && <QuotesTab quotes={result.quotes} activeMood={activeMood} />}
      {tab === 'clips'   && <ClipsTab ideas={result.clip_ideas} activeMood={activeMood} />}
      {tab === 'post'    && <PostTab text={result.telegram_post} onCreatePost={onCreatePost} onShowFlash={onShowFlash} activeMood={activeMood} />}
      {tab === 'tiktok'  && <TikTokTab script={result.tiktok_script} activeMood={activeMood} />}
    </div>
  )
}

// ── Movies Tab ────────────────────────────────────────────────────────────────

function MoviesTab({ movies, activeMood }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
      {movies.map((movie, i) => (
        <div key={i} style={{
          ...card,
          borderTop: `3px solid ${activeMood.color}`,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
              {movie.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {movie.year} · {movie.director}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {movie.why}
          </div>
          <div style={{
            fontSize: 11, color: activeMood.color,
            background: `${activeMood.color}10`,
            border: `1px solid ${activeMood.color}20`,
            borderRadius: 6, padding: '6px 8px',
            fontStyle: 'italic',
          }}>
            {movie.atmosphere}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Scenes Tab ────────────────────────────────────────────────────────────────

function ScenesTab({ scenes, activeMood }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {scenes.map((scene, i) => (
        <div key={i} style={{
          ...card,
          borderLeft: `3px solid ${activeMood.color}`,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, background: `${activeMood.color}20`,
            border: `1px solid ${activeMood.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}>🎥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: activeMood.color, fontWeight: 600, marginBottom: 4 }}>
              {scene.film}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
              {scene.scene}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Quotes Tab ────────────────────────────────────────────────────────────────

function QuotesTab({ quotes, activeMood }) {
  const [copied, setCopied] = useState(null)

  function copy(text, i) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(i)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {quotes.map((q, i) => (
        <div key={i} style={{
          ...card,
          background: `${activeMood.color}06`,
          borderColor: `${activeMood.color}25`,
          position: 'relative',
          cursor: 'pointer',
        }} onClick={() => copy(q.text, i)}>
          <div style={{ fontSize: 32, color: `${activeMood.color}30`, lineHeight: 1, marginBottom: 4 }}>"</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', lineHeight: 1.4, marginBottom: 8 }}>
            {q.text}
          </div>
          <div style={{ fontSize: 11, color: activeMood.color }}>
            — {q.char} · <span style={{ color: 'var(--text-muted)' }}>{q.film}</span>
          </div>
          <div style={{
            position: 'absolute', top: 10, right: 10,
            fontSize: 11, color: 'var(--text-muted)',
          }}>
            {copied === i ? '✓ Copied' : '⌘C'}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Clips Tab ─────────────────────────────────────────────────────────────────

function ClipsTab({ ideas, activeMood }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ideas.map((idea, i) => (
        <div key={i} style={{
          ...card,
          borderLeft: `3px solid #8B5CF6`,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 4, background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#8B5CF6', flexShrink: 0, fontWeight: 700,
          }}>{i + 1}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {idea}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Post Tab ──────────────────────────────────────────────────────────────────

function PostTab({ text, onCreatePost, onShowFlash, activeMood }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(text || '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button style={{
          padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
          background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
        }} onClick={() => setEditing(!editing)}>
          {editing ? '✓ Просмотр' : '✏ Редактировать'}
        </button>
        <button style={{
          padding: '6px 12px', borderRadius: 6,
          border: '1px solid var(--border-gold)', background: 'var(--gold-dim)',
          color: 'var(--gold)', fontSize: 11, cursor: 'pointer', fontWeight: 600,
        }} onClick={onCreatePost}>
          📢 Создать пост в Content
        </button>
      </div>

      {editing ? (
        <textarea
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            padding: '12px',
            fontSize: 13,
            lineHeight: 1.6,
            minHeight: 300,
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
          value={editText}
          onChange={e => setEditText(e.target.value)}
        />
      ) : (
        <div style={{
          ...card,
          background: `${activeMood.color}05`,
          borderColor: `${activeMood.color}20`,
          fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap', fontFamily: 'inherit',
        }}>
          {editText}
        </div>
      )}
    </div>
  )
}

// ── TikTok Tab ────────────────────────────────────────────────────────────────

function TikTokTab({ script, activeMood }) {
  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          padding: '4px 10px', borderRadius: 12,
          background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
          fontSize: 11, color: '#A78BFA', fontWeight: 600,
        }}>📱 TikTok / Reels Script</div>
      </div>
      <div style={{
        ...card,
        background: 'rgba(0,0,0,0.4)',
        borderColor: '#8B5CF650',
        fontSize: 13, lineHeight: 1.8, color: 'var(--text-primary)',
        whiteSpace: 'pre-wrap', fontFamily: 'monospace',
      }}>
        {script}
      </div>
    </div>
  )
}
