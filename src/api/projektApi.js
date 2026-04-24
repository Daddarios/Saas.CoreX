import axiosClient from './axiosClient';

export const projektApi = {
  getAll: (page = 1, size = 20, search = '') =>
    axiosClient.get('/projekt', { params: { page, size, search } }),

  getById: (id) => axiosClient.get(`/projekt/${id}`),

  create: (data) => axiosClient.post('/projekt', data),

  update: (id, data) => axiosClient.put(`/projekt/${id}`, data),

  delete: (id) => axiosClient.delete(`/projekt/${id}`),

  assignBenutzer: (projektId, benutzerId) =>
    axiosClient.post(`/projekt/${projektId}/benutzer`, { benutzerId }),

  removeBenutzer: (projektId, benutzerId) =>
    axiosClient.delete(`/projekt/${projektId}/benutzer/${benutzerId}`),
};
