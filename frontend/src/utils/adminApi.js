const SECRET_KEY = 'aureon_admin_secret'
const BASE = import.meta.env.VITE_API_URL || ''

export const getSecret = () => localStorage.getItem(SECRET_KEY) || ''
export const storeSecret = (s) => localStorage.setItem(SECRET_KEY, s)
export const clearSecret = () => localStorage.removeItem(SECRET_KEY)

export async function adminApi(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Secret': getSecret(),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.detail || `HTTP ${r.status}`)
  return d
}

export async function verifySecret(secret) {
  const r = await fetch(`${BASE}/api/admin/purchase-requests`, {
    headers: { 'X-Admin-Secret': secret },
  })
  return r.ok
}
