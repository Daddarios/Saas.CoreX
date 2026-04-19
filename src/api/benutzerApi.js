import axiosClient from './axiosClient';

export const benutzerApi = {
  getAll: () => axiosClient.get('/benutzer'),
  getById: (id) => axiosClient.get(`/benutzer/${id}`),
  create: (data) => axiosClient.post('/benutzer', data),
  update: (id, data) => axiosClient.put(`/benutzer/${id}`, data),
  delete: (id) => axiosClient.delete(`/benutzer/${id}`),
};