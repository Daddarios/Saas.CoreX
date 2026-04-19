import axiosClient from './axiosClient';

export const kundeApi = {
  getAll: (page = 1, size = 20, search = '') =>
    axiosClient.get('/kunde', { params: { page, size, search } }),

  getById: (id) => axiosClient.get(`/kunde/${id}`),

  create: (data) => axiosClient.post('/kunde', data),

  update: (id, data) => axiosClient.put(`/kunde/${id}`, data),

  delete: (id) => axiosClient.delete(`/kunde/${id}`),
};
