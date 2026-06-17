import axios from 'axios'

const BASE = ''
const pin = () => localStorage.getItem('stockai_pin') || ''

const client = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' }
})

client.interceptors.request.use(config => {
  config.headers['x-dashboard-pin'] = pin()
  return config
})

export const api = {
  // Auth
  login: (p) => client.post('/api/auth/login', { pin: p }),

  // Drive
  getFolders: () => client.get('/api/drive/folders'),
  getFiles: (folderId) => client.get('/api/drive/files', { params: { folderId } }),
  uploadFiles: (form) => client.post('/api/drive/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteFile: (fileId) => client.delete(`/api/drive/files/${fileId}`),

  // N8N
  executeWorkflow: () => client.post('/api/n8n/execute'),
  getExecutions: () => client.get('/api/n8n/executions'),
  getWorkflowStatus: () => client.get('/api/n8n/status'),
  getWorkflowInfo: () => client.get('/api/n8n/workflow-info'),

  // Auto Mode
  getAutoMode: () => client.get('/api/automode'),
  setAutoMode: (enabled) => client.post('/api/automode', { enabled }),

  // System
  getSysInfo: () => client.get('/api/desktop/sysinfo'),

  // Desktop
  openExplorer: (path) => client.post('/api/desktop/explorer', { path }),
  openUpscayl: () => client.post('/api/desktop/upscayl'),
  openCmd: () => client.post('/api/desktop/cmd'),

  // AI Bot
  botChat: (messages, mode) => client.post('/api/bot/chat', { messages, mode }),

  // Generate
  generateImage: (prompt, mode) => client.post('/api/generate/image', { prompt, mode }),
  generateVideo: (prompt) => client.post('/api/generate/video', { prompt }),
  getVideoStatus: () => client.get('/api/generate/video/status'),
}