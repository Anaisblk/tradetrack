import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth-storage')
  if (raw) {
    try {
      const { state } = JSON.parse(raw)
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`
      }
    } catch {}
  }
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }
      originalRequest._retry = true
      isRefreshing = true
      try {
        const raw = localStorage.getItem('auth-storage')
        const { state } = JSON.parse(raw)
        const resp = await axios.post('/api/auth/refresh', {
          refresh_token: state.refreshToken,
        })
        const { access_token, refresh_token, user } = resp.data
        const newState = { ...state, accessToken: access_token, refreshToken: refresh_token, user }
        localStorage.setItem('auth-storage', JSON.stringify({ state: newState }))
        processQueue(null, access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (err) {
        processQueue(err, null)
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api
