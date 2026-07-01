/**
 * mix-data-api HTTP 调用封装
 */

const DEFAULT_API_BASE = (import.meta.env.VITE_API_BASE || '').trim()

// API 地址可在运行时由前端设置（App.vue 的“API 地址”输入框）
let _apiBase = localStorage.getItem('mix_api_base') || DEFAULT_API_BASE

export function getApiBase() {
  return _apiBase
}

export function setApiBase(base: string) {
  _apiBase = (base || DEFAULT_API_BASE).trim()
  if (_apiBase) {
    localStorage.setItem('mix_api_base', _apiBase)
  } else {
    localStorage.removeItem('mix_api_base')
  }
}

/** 恢复默认 API 地址，清除本地自定义（用于界面“重置”按钮，避免用户改错地址后无法恢复） */
export function resetApiBase() {
  _apiBase = DEFAULT_API_BASE
  if (_apiBase) {
    localStorage.setItem('mix_api_base', _apiBase)
  } else {
    localStorage.removeItem('mix_api_base')
  }
  return DEFAULT_API_BASE
}

// 鉴权凭证（二选一）
let _token = localStorage.getItem('mix_token') || ''
let _apiKey = localStorage.getItem('mix_api_key') || ''

export function setToken(token: string) {
  _token = token
  localStorage.setItem('mix_token', token)
}

export function setApiKey(key: string) {
  _apiKey = key
  localStorage.setItem('mix_api_key', key)
}

export function getToken() {
  return _token
}

async function request(action: string, params: Record<string, any> = {}) {
  if (!_apiBase) {
    throw new Error('请先配置正式可用的 mix-data-api 地址')
  }

  const body: Record<string, any> = { action, ...params }

  // 优先 token，其次 apiKey
  if (_token) {
    body.token = _token
  } else if (_apiKey) {
    body.apiKey = _apiKey
  }

  const res = await fetch(_apiBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    throw new Error(`接口请求失败（HTTP ${res.status}）`)
  }

  const json = await res.json()
  if (json.errCode && json.errCode !== 0) {
    throw new Error(json.errMsg || '请求失败')
  }
  return json.data
}

/** 获取站点当前材料绑定 */
export function getMaterialBindings(plantId: string) {
  return request('getMaterialBindings', { plant_id: plantId })
}

/** 获取最新检测记录 */
export function getLatestRecords() {
  return request('getLatestRecords')
}

/** 获取30天平均值 */
export function get30DayAvg() {
  return request('get30DayAvg')
}

/** 上传文件（base64） */
export function uploadFile(fileBase64: string, filename: string, ext = 'jpg') {
  return request('uploadFile', { fileBase64, filename, ext, purpose: 'mix_report_image' })
}

/** 生成配合比报告 PDF */
export function generateMixReportPdf(imageFileID: string, reportNo: string, fileName: string) {
  return request('generateMixReportPdf', { imageFileID, reportNo, fileName })
}
