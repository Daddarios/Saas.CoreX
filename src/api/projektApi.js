import axiosClient from './axiosClient';

export const projektApi = {
  getAll: (page = 1, size = 20, search = '', kundeId = null) => {
    const params = { page, size, search };
    if (kundeId) params.kundeId = kundeId;
    return axiosClient.get('/projekt', { params });
  },

  getByKunde: (kundeId) =>
    axiosClient.get('/projekt', { params: { kundeId, page: 1, size: 1000 } }),

  getById: (id) => axiosClient.get(`/projekt/${id}`),

  create: (data) => axiosClient.post('/projekt', data),

  update: (id, data) => axiosClient.put(`/projekt/${id}`, data),

  delete: (id) => axiosClient.delete(`/projekt/${id}`),

  assignBenutzer: (projektId, benutzerId) =>
    axiosClient.post(`/projekt/${projektId}/benutzer`, { benutzerId }),

  removeBenutzer: (projektId, benutzerId) =>
    axiosClient.delete(`/projekt/${projektId}/benutzer/${benutzerId}`),

  assignAnsprechpartner: (projektId, ansprechpartnerId) =>
    axiosClient.post(`/projekt/${projektId}/ansprechpartner`, { ansprechpartnerId }),

  removeAnsprechpartner: (projektId, ansprechpartnerId) =>
    axiosClient.delete(`/projekt/${projektId}/ansprechpartner/${ansprechpartnerId}`),
};
