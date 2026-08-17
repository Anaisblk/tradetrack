import api from './axios'

export const fetchDashboardToday = () => api.get('/dashboard/today').then((r) => r.data)
export const fetchDashboardMonthly = () => api.get('/dashboard/monthly').then((r) => r.data)
export const fetchDashboardAnnual = () => api.get('/dashboard/annual').then((r) => r.data)

// Stats atelier (réparations)
export const fetchRepairsStats = (period) => api.get('/dashboard/repairs-stats', { params: { period } }).then((r) => r.data)
export const fetchRepairsMonthly = () => api.get('/dashboard/repairs-monthly').then((r) => r.data)
export const fetchRepairsDailyRevenue = () => api.get('/dashboard/repairs-daily-revenue').then((r) => r.data)
export const fetchTopDevices = (limit = 10) => api.get('/dashboard/top-devices', { params: { limit } }).then((r) => r.data)
export const fetchRepairsStatusBreakdown = () => api.get('/dashboard/repairs-status-breakdown').then((r) => r.data)
export const fetchRepairsAvgDuration = () => api.get('/dashboard/repairs-avg-duration').then((r) => r.data)
