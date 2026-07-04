import React, { useState, useEffect, useCallback } from 'react'
import { getSecret, storeSecret, clearSecret, verifySecret } from '../utils/adminApi.js'

export default function AdminGuard({ children }) {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(true)
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    const stored = getSecret()
    if (!stored) { setChecking(false); return }
    verifySecret(stored)
      .then(ok => { if (ok) setAuthed(true); else clearSecret() })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  const login = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    setLogging(true)
    setError(null)
    try {
      const ok = await verifySecret(input.trim())
      if (ok) {
        storeSecret(input.trim())
        setAuthed(true)
      } else {
        setError('Wrong secret')
      }
    } catch {
      setError('Backend offline')
    } finally {
      setLogging(false)
    }
  }

  const logout = useCallback(() => {
    clearSecret()
    setAuthed(false)
    setInput('')
    setError(null)
  }, [])

  if (checking) return (
    <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>
      Checking auth...
    </div>
  )

  if (!authed) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '32px 28px',
        width: '100%',
        maxWidth: 360,
      }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48,
            background: 'var(--gold-dim)',
            border: '1px solid var(--border-gold)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, margin: '0 auto 14px',
          }}>🔐</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
            Admin Access
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Enter ADMIN_SECRET to continue
          </div>
        </div>

        <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Admin secret..."
            autoFocus
            style={{
              background: 'var(--bg-elevated)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'monospace',
            }}
          />
          {error && (
            <div style={{
              fontSize: 12,
              color: '#F87171',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 6,
              padding: '6px 10px',
            }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={logging || !input.trim()}
            style={{
              background: logging || !input.trim()
                ? 'rgba(212,175,55,0.2)'
                : 'linear-gradient(135deg, #D4AF37, #B8960C)',
              border: 'none',
              borderRadius: 8,
              padding: '10px',
              color: logging || !input.trim() ? 'var(--text-muted)' : '#0A0A0B',
              fontSize: 13,
              fontWeight: 700,
              cursor: logging || !input.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          >
            {logging ? 'Verifying...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={logout}
        title="Logout from admin"
        style={{
          position: 'absolute',
          top: -4,
          right: 0,
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 10px',
          color: 'var(--text-muted)',
          fontSize: 11,
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        🔓 Logout
      </button>
      {children}
    </div>
  )
}
