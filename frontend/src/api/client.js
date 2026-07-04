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
export const getTelegramUpdates = () => api.get('/api/telegram/get-updates').then(r => r.data)
export const importTelegramChatId = (data) => api.post('/api/telegram/import-chat-id', data).then(r => r.data)

// Bot
export const getBotStatus = () => api.get('/api/telegram/bot-status').then(r => r.data)
export const getBotUsers = () => api.get('/api/telegram/bot-users').then(r => r.data)
export const getBotActions = (limit = 20) => api.get('/api/telegram/bot-actions', { params: { limit } }).then(r => r.data)
export const startBot = () => api.post('/api/telegram/start-bot').then(r => r.data)
export const stopBot = () => api.post('/api/telegram/stop-bot').then(r => r.data)
export const setWebhook = (webhook_url) => api.post('/api/telegram/set-webhook', { webhook_url }).then(r => r.data)
export const syncTelegramUpdates = () => api.get('/api/telegram/sync-updates').then(r => r.data)
export const syncSalesChatIds = () => api.post('/api/sales/sync-chat-ids').then(r => r.data)

export const getAutomationStatus = () => api.get('/api/automation/status').then(r => r.data)
export const startAutomation = () => api.post('/api/automation/start').then(r => r.data)
export const stopAutomation = () => api.post('/api/automation/stop').then(r => r.data)
export const runAutomationNow = () => api.post('/api/automation/run-now').then(r => r.data)

// Admin
export const clearDemoData = () => api.post('/api/admin/clear-demo-data').then(r => r.data)
export const getDemoDataCount = () => api.get('/api/admin/demo-data-count').then(r => r.data)

// Lead Finder
export const findRealLeads = (data) => api.post('/api/leads/find-real', data).then(r => r.data)
export const generateOutreach = (leadId) => api.post(`/api/leads/${leadId}/generate-outreach`).then(r => r.data)
export const generateOfferForLead = (leadId) => api.post(`/api/leads/${leadId}/generate-offer`).then(r => r.data)
export const getPipelineStats = () => api.get('/api/leads/pipeline/stats').then(r => r.data)
export const markLeadContacted = (id) => api.post(`/api/leads/${id}/mark-contacted`).then(r => r.data)
export const markLeadProposalSent = (id) => api.post(`/api/leads/${id}/mark-proposal-sent`).then(r => r.data)
export const markLeadWon = (id) => api.post(`/api/leads/${id}/mark-won`).then(r => r.data)
export const markLeadLost = (id) => api.post(`/api/leads/${id}/mark-lost`).then(r => r.data)

// Services catalog
export const getServicesCatalog = () => api.get('/api/offers/services/catalog').then(r => r.data)

export default api
