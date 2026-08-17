import api from './axios'

export const fetchProducts = (params) => api.get('/products', { params }).then((r) => r.data)
export const fetchProductsPaginated = (params) => api.get('/products/paginated', { params }).then((r) => r.data)
export const fetchProduct = (id) => api.get(`/products/${id}`).then((r) => r.data)
export const fetchByBarcode = (barcode) => api.get(`/products/barcode/${barcode}`).then((r) => r.data)
export const createProduct = (data) => api.post('/products', data).then((r) => r.data)
export const updateProduct = (id, data) => api.put(`/products/${id}`, data).then((r) => r.data)
export const deleteProduct = (id) => api.delete(`/products/${id}`)
export const fetchCategories = () => api.get('/categories').then((r) => r.data)
export const createCategory = (data) => api.post('/categories', data).then((r) => r.data)
export const fetchStockMovements = (params) => api.get('/stock/movements', { params }).then((r) => r.data)
export const addStockMovement = (data) => api.post('/stock/movements', data).then((r) => r.data)
