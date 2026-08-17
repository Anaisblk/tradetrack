import api from './axios'

export const login = (email, password) =>
  api.post('/auth/login', new URLSearchParams({ username: email, password }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }).then((r) => r.data)

export const register = (data) => api.post('/auth/register', data).then((r) => r.data)

export const refreshToken = (refresh_token) =>
  api.post('/auth/refresh', { refresh_token }).then((r) => r.data)
