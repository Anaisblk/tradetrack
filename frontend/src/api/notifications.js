import api from './axios'

export const fetchNotifications = (unread_only = false) =>
  api.get('/notifications', { params: { unread_only } }).then((r) => r.data)
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`).then((r) => r.data)
export const markAllRead = () => api.put('/notifications/read-all')
