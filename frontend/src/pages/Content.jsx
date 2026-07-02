import React, { useEffect, useState } from 'react'
import { getContent, generatePost, updatePostStatus, deletePost, publishPostToTelegram } from '../api/client.js'
import { MOCK_CONTENT } from '../api/mockData.js'
import Button from '../components/Button.jsx'

const TOPICS = ['AUREON', 'AI', 'предпринимательство', 'WAIC 2027', 'дисциплина', 'продуктивность']

const STATUS_STYLE = {
  draft: { label: 'Draft', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)' },
  ready: { label: 'Ready', color: 'var(--gold)', bg: 'var(--gold-dim)' },
  published: { label: 'Published', color: 'var(--green)', bg: 'var(--green-dim)' },
}

function PostCard({ post, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [tgResult, setTgResult] = useState(null)
  const st = STATUS_STYLE[post.status] || STATUS_STYLE.draft

  const copy = () => {
    navigator.clipboard.writeText(post.content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const markReady = async () => {
    try { await updatePostStatus(post.id, post.status === 'draft' ? 'ready' : 'published') } catch {}
    onUpdate()
  }

  const remove = async () => {
    try { await deletePost(post.id) } catch {}
    onUpdate()
  }

  const publishTelegram = async () => {
    setPublishing(true)
    setTgResult(null)
    try {
      await publishPostToTelegram(post.id)
      setTgResult({ ok: true, msg: 'Опубликовано в Telegram' })
      onUpdate()
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Ошибка публикации'
      setTgResult({ ok: false, msg: detail })
    }
    setPublishing(false)
    setTimeout(() => setTgResult(null), 4000)
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', marginBottom: '4px' }}>
              {post.title}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '9px',
                color: st.color,
                background: st.bg,
                border: `1px solid ${st.color}30`,
                padding: '2px 7px',
                borderRadius: '4px',
                fontWeight: 500,
              }}>{st.label}</span>
              <span style={{
                fontSize: '9px',
                color: 'var(--purple)',
                background: 'var(--purple-dim)',
                padding: '2px 7px',
                borderRadius: '4px',
              }}>{post.topic}</span>
              <span style={{
                fontSize: '9px',
                color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.04)',
                padding: '2px 7px',
                borderRadius: '4px',
              }}>{post.platform}</span>
            </div>
          </div>
          <button onClick={remove} style={{
            color: 'var(--text-muted)',
            fontSize: '16px',
            padding: '0 4px',
            cursor: 'pointer',
            marginLeft: '8px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >×</button>
        </div>

        {expanded && (
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            marginBottom: '10px',
            border: '1px solid var(--border)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <pre style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              lineHeight: 1.7,
              margin: 0,
            }}>{post.content}</pre>
          </div>
        )}

        {tgResult && (
          <div style={{
            fontSize: '11px',
            color: tgResult.ok ? 'var(--green)' : 'var(--red)',
            background: tgResult.ok ? 'var(--green-dim)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${tgResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: '5px',
            padding: '5px 10px',
            marginBottom: '8px',
            animation: 'fadeIn 0.2s ease',
          }}>
            {tgResult.ok ? '✓ ' : '✗ '}{tgResult.msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={() => setExpanded(!expanded)} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            padding: '4px 10px',
            borderRadius: '5px',
            fontSize: '11px',
            cursor: 'pointer',
          }}>
            {expanded ? 'Hide' : 'Preview'}
          </button>
          <button onClick={copy} style={{
            background: copied ? 'var(--green-dim)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
            color: copied ? 'var(--green)' : 'var(--text-muted)',
            padding: '4px 10px',
            borderRadius: '5px',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          {post.status !== 'published' && (
            <>
              <button onClick={markReady} style={{
                background: post.status === 'draft' ? 'var(--gold-dim)' : 'var(--green-dim)',
                border: `1px solid ${post.status === 'draft' ? 'var(--border-gold)' : 'rgba(16,185,129,0.3)'}`,
                color: post.status === 'draft' ? 'var(--gold)' : 'var(--green)',
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                cursor: 'pointer',
                marginLeft: 'auto',
              }}>
                {post.status === 'draft' ? 'Mark Ready' : 'Mark Published'}
              </button>
              <button onClick={publishTelegram} disabled={publishing} style={{
                background: 'rgba(41,182,246,0.08)',
                border: '1px solid rgba(41,182,246,0.25)',
                color: '#29B6F6',
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                cursor: publishing ? 'not-allowed' : 'pointer',
                opacity: publishing ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}>
                {publishing ? '⟳ Sending...' : '✈ Publish to Telegram'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Content() {
  const [posts, setPosts] = useState([])
  const [selectedTopic, setSelectedTopic] = useState('AUREON')
  const [generating, setGenerating] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = () => getContent().then(setPosts).catch(() => setPosts(MOCK_CONTENT))
  useEffect(() => { load() }, [])

  const generate = async () => {
    setGenerating(true)
    try { await generatePost(selectedTopic) } catch {}
    setGenerating(false)
    load()
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)

  return (
    <div style={{ maxWidth: 900, animation: 'fadeIn 0.3s ease' }}>
      {/* Stats + controls */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        marginBottom: '16px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          {[
            { label: 'Total', value: posts.length },
            { label: 'Ready', value: posts.filter(p => p.status === 'ready').length, color: 'var(--gold)' },
            { label: 'Published', value: posts.filter(p => p.status === 'published').length, color: 'var(--green)' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 10px',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            cursor: 'pointer',
          }}>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button variant="primary" onClick={generate} disabled={generating} size="sm">
            {generating ? '⟳ Generating...' : '✨ Generate Post'}
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {['all', 'draft', 'ready', 'published'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '4px 10px',
            borderRadius: '6px',
            border: filter === s ? '1px solid var(--border-gold)' : '1px solid var(--border)',
            background: filter === s ? 'var(--gold-dim)' : 'transparent',
            color: filter === s ? 'var(--gold)' : 'var(--text-muted)',
            fontSize: '11px',
            cursor: 'pointer',
            textTransform: 'capitalize',
          }}>
            {s} ({s === 'all' ? posts.length : posts.filter(p => p.status === s).length})
          </button>
        ))}
      </div>

      {/* Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(post => (
          <PostCard key={post.id} post={post} onUpdate={load} />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px', fontSize: '13px' }}>
            No posts yet. Click "Generate Post" to create one.
          </div>
        )}
      </div>
    </div>
  )
}
