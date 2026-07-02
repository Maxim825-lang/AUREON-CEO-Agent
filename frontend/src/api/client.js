import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error('API error:', err.message)
    return Promise.reject(err)
  }
)

export const getState = () => api.get('/api/state').then(r => r.data)
export const getAgents = () => api.get('/api/agents').then(r => r.data)
export const getTasks = (status) => api.get('/api/tasks', { params: status ? { status } : {} }).then(r => r.data)
export const createTask = (data) => api.post('/api/tasks', data).then(r => r.data)
export const updateTaskStatus = (id, status) => api.patch(`/api/tasks/${id}/status`, null, { params: { status } }).then(r => r.data)
export const deleteTask = (id) => api.delete(`/api/tasks/${id}`).then(r => r.data)
export const getActions = (limit = 20) => api.get('/api/actions', { params: { limit } }).then(r => r.data)
export const runCycle = () => api.post('/api/run-cycle').then(r => r.data)
export const getLeads = () => api.get('/api/leads').then(r => r.data)
export const createLead = (data) => api.post('/api/leads', data).then(r => r.data)
export const updateLeadStatus = (id, status) => api.patch(`/api/leads/${id}/status`, null, { params: { status } }).then(r => r.data)
export const getContent = () => api.get('/api/content').then(r => r.data)
export const generatePost = (topic) => api.post('/api/content/generate', { topic }).then(r => r.data)
export const updatePostStatus = (id, status) => api.patch(`/api/content/${id}/status`, null, { params: { status } }).then(r => r.data)
export const deletePost = (id) => api.delete(`/api/content/${id}`).then(r => r.data)
export const getOffers = () => api.get('/api/offers').then(r => r.data)
export const generateOffer = (data) => api.post('/api/offers/generate', data).then(r => r.data)
export const updateOfferStatus = (id, status) => api.patch(`/api/offers/${id}/status`, null, { params: { status } }).then(r => r.data)
export const getStrategy = () => api.get('/api/strategy').then(r => r.data)
export const getSettings = () => api.get('/api/settings').then(r => r.data)
export const updateSettings = (data) => api.patch('/api/settings', data).then(r => r.data)

export const saveTelegramSettings = (bot_token, channel_id) =>
  api.post('/api/settings/telegram', { bot_token, channel_id }).then(r => r.data)
export const testTelegram = () => api.post('/api/telegram/test').then(r => r.data)
export const getTelegramStatus = () => api.get('/api/telegram/status').then(r => r.data)
export const publishPostToTelegram = (id) => api.post(`/api/telegram/publish-post/${id}`).then(r => r.data)
export const publishLatestToTelegram = () => api.post('/api/telegram/publish-latest-post').then(r => r.data)

export default api
