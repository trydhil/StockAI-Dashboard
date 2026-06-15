import axios from 'axios'

const BASE = '/api'
const headers = () => ({ 'x-dashboard-pin': localStorage.getItem('stockai_pin') || '' })

export const api = {
  // Auth
  login: (pin) => axios.post(`${BASE}/auth/login`, { pin }),

  // Drive
  getFiles: (folderId) => axios.get(`${BASE}/drive/files?folderId=${folderId}`, { headers: headers() }),
  uploadFiles: (formData) => axios.post(`${BASE}/drive/upload`, formData, {
    headers: { ...headers(), 'Content-Type': 'multipart/form-data' }
  }),
  deleteFile: (fileId) => axios.delete(`${BASE}/drive/files/${fileId}`, { headers: headers() }),
  getFolders: () => axios.get(`${BASE}/drive/folders`, { headers: headers() }),

  // n8n
executeWorkflow: () => axios.post(`${BASE}/n8n/execute`, {}, { 
  headers: headers(),
  timeout: 30000
}),  getExecutions: () => axios.get(`${BASE}/n8n/executions`, { headers: headers() }),
  getN8nStatus: () => axios.get(`${BASE}/n8n/status`, { headers: headers() }),

  // AI Bot & Generate
  botChat: (messages, mode) => axios.post(`${BASE}/bot/chat`, { messages, mode }, { headers: headers() }),
  generateImage: (prompt, mode) => axios.post(`${BASE}/generate/image`, { prompt, mode }, { headers: headers() }),
  generateVideo: (prompt) => axios.post(`${BASE}/generate/video`, { prompt }, { headers: headers() }),
  getVideoStatus: () => axios.get(`${BASE}/generate/video/status`, { headers: headers() }),

  // Desktop
  openUpscayl: () => axios.post(`${BASE}/desktop/upscayl`, {}, { headers: headers() }),
  openExplorer: (path) => axios.post(`${BASE}/desktop/explorer`, { path }, { headers: headers() }),
  openCmd: () => axios.post(`${BASE}/desktop/cmd`, {}, { headers: headers() }),
  getSysInfo: () => axios.get(`${BASE}/desktop/sysinfo`, { headers: headers() }),

  // Auto mode
  setAutoMode: (enabled) => axios.post(`${BASE}/automode`, { enabled }, { headers: headers() }),
  getAutoMode: () => axios.get(`${BASE}/automode`, { headers: headers() }),
}
