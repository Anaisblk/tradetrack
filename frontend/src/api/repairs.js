import api from './axios'

export const fetchRepairs = (params) => api.get('/repairs', { params }).then((r) => r.data)
export const fetchRepairsPaginated = (params) => api.get('/repairs/paginated', { params }).then((r) => r.data)
export const fetchRepair = (id) => api.get(`/repairs/${id}`).then((r) => r.data)
export const createRepair = (data) => api.post('/repairs', data).then((r) => r.data)
export const updateRepair = (id, data) => api.put(`/repairs/${id}`, data).then((r) => r.data)
export const updateRepairStatus = (id, status) => api.put(`/repairs/${id}/status`, null, { params: { status } }).then((r) => r.data)
