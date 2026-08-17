import api from './axios'

export const fetchClients = (params) => api.get('/clients', { params }).then((r) => r.data)
export const fetchClientsPaginated = (params) => api.get('/clients/paginated', { params }).then((r) => r.data)
export const fetchClient = (id) => api.get(`/clients/${id}`).then((r) => r.data)
export const createClient = (data) => api.post('/clients', data).then((r) => r.data)
export const updateClient = (id, data) => api.put(`/clients/${id}`, data).then((r) => r.data)

// RGPD
export const fetchMe = () => api.get('/clients/me').then((r) => r.data)
export const exportMyData = () => api.get('/clients/me/export', { responseType: 'blob' }).then((r) => r.data)
export const requestMyDeletion = () => api.post('/clients/me/request-deletion').then((r) => r.data)

// Admin — demandes de suppression RGPD
export const fetchDeletionRequests = () => api.get('/admin/deletion-requests').then((r) => r.data)
export const approveDeletionRequest = (userId) => api.post(`/admin/deletion-requests/${userId}/approve`).then((r) => r.data)
