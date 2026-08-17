import api from './axios'

export const fetchQuotes = (params) => api.get('/quotes', { params }).then((r) => r.data)
export const fetchQuotesPaginated = (params) => api.get('/quotes/paginated', { params }).then((r) => r.data)
export const fetchQuote = (id) => api.get(`/quotes/${id}`).then((r) => r.data)
export const createQuote = (data) => api.post('/quotes', data).then((r) => r.data)
export const updateQuote = (id, data) => api.put(`/quotes/${id}`, data).then((r) => r.data)
